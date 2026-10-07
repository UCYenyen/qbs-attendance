-- One-day schedule swaps between two employees, approved by an admin.
-- An approved swap writes one schedule_override per employee for that date; the weekly schedule
-- stays untouched. Everything that needs "the shift on date X" uses private.effective_shifts().

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.schedule_swaps (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  status public.request_status not null default 'pending',
  note text check (note is null or char_length(note) <= 500),
  -- Shifts at request/approval time: {"is_working_day": bool, "start_time": "HH:MI", "end_time": "HH:MI"}
  requester_shift jsonb,
  partner_shift jsonb,
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (requester_id <> partner_id)
);
create unique index schedule_swaps_one_pending_per_day_idx
  on public.schedule_swaps (requester_id, work_date) where status = 'pending';
create index schedule_swaps_status_idx on public.schedule_swaps (status, work_date);
create index schedule_swaps_partner_idx on public.schedule_swaps (partner_id);

create table public.schedule_overrides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  is_working_day boolean not null,
  start_time time not null default '08:00',
  end_time time not null default '21:00',
  swap_id uuid references public.schedule_swaps (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, work_date),
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- Effective schedule helpers
-- ---------------------------------------------------------------------------
-- Shift of every active employee on a date: a date override wins over the weekly schedule.
-- Security invoker: RLS decides which rows a caller sees (admins/service code see all).
create or replace function private.effective_shifts(p_date date)
returns table (
  user_id uuid,
  is_working_day boolean,
  start_time time,
  end_time time,
  effective_since timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    coalesce(o.is_working_day, s.is_working_day, false),
    coalesce(o.start_time, s.start_time),
    coalesce(o.end_time, s.end_time),
    case when o.user_id is not null then o.created_at else s.approved_at end
  from public.profiles p
  left join public.schedule_overrides o on o.user_id = p.id and o.work_date = p_date
  left join public.schedules s on s.user_id = p.id and s.weekday = extract(dow from p_date)::integer
  where p.role = 'active_employee'
    and (o.user_id is not null or s.user_id is not null);
$$;
grant execute on function private.effective_shifts(date) to authenticated, service_role;

-- One employee's shift on a date as JSON (used for swap snapshots). Security definer so an
-- employee's swap request can snapshot the partner's shift, which RLS would otherwise hide.
create or replace function private.shift_json(p_user uuid, p_date date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'is_working_day', e.is_working_day,
        'start_time', to_char(e.start_time, 'HH24:MI'),
        'end_time', to_char(e.end_time, 'HH24:MI')
      )
      from private.effective_shifts(p_date) e
      where e.user_id = p_user
    ),
    jsonb_build_object('is_working_day', false, 'start_time', null, 'end_time', null)
  );
$$;
revoke all on function private.shift_json(uuid, date) from public;
grant execute on function private.shift_json(uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Validation on request
-- ---------------------------------------------------------------------------
create or replace function private.validate_schedule_swap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'pending';
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_note := null;

  if new.requester_id = new.partner_id then
    raise exception 'Tidak bisa tukar jadwal dengan diri sendiri' using errcode = '22023';
  end if;

  if new.work_date < private.local_today() then
    raise exception 'Tanggal tukar jadwal sudah lewat' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = new.partner_id and role = 'active_employee') then
    raise exception 'Rekan tukar harus karyawan aktif' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.schedule_swaps s
    where s.status = 'pending'
      and s.work_date = new.work_date
      and (s.requester_id in (new.requester_id, new.partner_id) or s.partner_id in (new.requester_id, new.partner_id))
  ) then
    raise exception 'Sudah ada pengajuan tukar jadwal di tanggal itu yang menunggu review' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.attendance a
    where a.work_date = new.work_date and a.user_id in (new.requester_id, new.partner_id)
  ) then
    raise exception 'Sudah ada absensi di tanggal itu, jadwal tidak bisa ditukar' using errcode = '22023';
  end if;

  new.requester_shift := private.shift_json(new.requester_id, new.work_date);
  new.partner_shift := private.shift_json(new.partner_id, new.work_date);

  if not (new.requester_shift ->> 'is_working_day')::boolean
     and not (new.partner_shift ->> 'is_working_day')::boolean then
    raise exception 'Kalian berdua libur di tanggal itu' using errcode = '22023';
  end if;

  if new.requester_shift = new.partner_shift then
    raise exception 'Jadwal kalian di tanggal itu sama, tidak perlu ditukar' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger schedule_swaps_validate before insert on public.schedule_swaps
  for each row execute function private.validate_schedule_swap();

-- Push to admins for every new swap request.
create or replace function private.notify_schedule_swap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.invoke_edge_function(
    'notify-admins',
    jsonb_build_object('type', 'schedule_swap', 'swap_id', new.id, 'user_id', new.requester_id)
  );
  return new;
end;
$$;

create trigger schedule_swaps_notify after insert on public.schedule_swaps
  for each row execute function private.notify_schedule_swap();

-- ---------------------------------------------------------------------------
-- Admin review
-- ---------------------------------------------------------------------------
create or replace function public.review_schedule_swap(
  p_swap_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_swap public.schedule_swaps;
  v_requester jsonb;
  v_partner jsonb;
begin
  if not private.is_admin() then
    raise exception 'Hanya admin yang bisa mereview tukar jadwal' using errcode = '42501';
  end if;

  select * into v_swap
  from public.schedule_swaps
  where id = p_swap_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan atau sudah direview' using errcode = 'P0002';
  end if;

  if p_approve then
    if v_swap.work_date < private.local_today() then
      raise exception 'Tanggal tukar jadwal sudah lewat' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.attendance a
      where a.work_date = v_swap.work_date and a.user_id in (v_swap.requester_id, v_swap.partner_id)
    ) then
      raise exception 'Sudah ada absensi di tanggal itu, jadwal tidak bisa ditukar' using errcode = '22023';
    end if;

    -- Use the shifts as they are now (an earlier swap may have changed them since the request).
    v_requester := private.shift_json(v_swap.requester_id, v_swap.work_date);
    v_partner := private.shift_json(v_swap.partner_id, v_swap.work_date);

    insert into public.schedule_overrides (user_id, work_date, is_working_day, start_time, end_time, swap_id)
    values
      (
        v_swap.requester_id, v_swap.work_date,
        (v_partner ->> 'is_working_day')::boolean,
        coalesce((v_partner ->> 'start_time')::time, '08:00'),
        coalesce((v_partner ->> 'end_time')::time, '21:00'),
        v_swap.id
      ),
      (
        v_swap.partner_id, v_swap.work_date,
        (v_requester ->> 'is_working_day')::boolean,
        coalesce((v_requester ->> 'start_time')::time, '08:00'),
        coalesce((v_requester ->> 'end_time')::time, '21:00'),
        v_swap.id
      )
    on conflict (user_id, work_date) do update
      set is_working_day = excluded.is_working_day,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          swap_id = excluded.swap_id,
          created_at = now();
  end if;

  update public.schedule_swaps
  set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
      review_note = nullif(trim(p_note), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      requester_shift = coalesce(v_requester, requester_shift),
      partner_shift = coalesce(v_partner, partner_shift)
  where id = v_swap.id;
end;
$$;
revoke all on function public.review_schedule_swap(uuid, boolean, text) from public, anon;
grant execute on function public.review_schedule_swap(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Absence marking + today's summary now follow the effective (swapped) schedule
-- ---------------------------------------------------------------------------
create or replace function private.mark_absences()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  with cfg as (
    select timezone, window_before_min, window_after_min,
           (now() at time zone timezone) as local_now
    from public.app_settings
  ),
  days as (
    select (cfg.local_now::date - offs) as day
    from cfg, generate_series(0, 1) offs
  ),
  candidates as (
    select
      e.user_id,
      days.day,
      v.session,
      days.day + case when v.session = 'check_in' then e.start_time else e.end_time end as expected_at,
      e.effective_since
    from days
    cross join lateral private.effective_shifts(days.day) e
    cross join (values ('check_in'::public.attendance_session), ('check_out'::public.attendance_session)) v(session)
    where e.is_working_day
  )
  insert into public.attendance (user_id, work_date, session, status)
  select c.user_id, c.day, c.session, 'absence'
  from candidates c, cfg
  where cfg.local_now > c.expected_at + make_interval(mins => cfg.window_after_min)
    -- don't mark sessions whose window opened before the schedule/override took effect
    and ((c.expected_at - make_interval(mins => cfg.window_before_min)) at time zone cfg.timezone) >= c.effective_since
  on conflict (user_id, work_date, session) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.today_summary(p_date date default null)
returns table (
  work_date date,
  expected integer,
  checked_in integer,
  late integer,
  checked_out integer,
  sick integer,
  excused integer,
  not_present integer,
  attendance_rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (
    select coalesce(p_date, private.local_today()) as day
  ),
  expected_users as (
    select e.user_id
    from d cross join lateral private.effective_shifts(d.day) e
    where e.is_working_day
    union
    select a.user_id
    from public.attendance a
    join public.profiles p on p.id = a.user_id and p.role not in ('admin', 'admin_qr')
    cross join d
    where a.work_date = d.day
  ),
  rows_today as (
    select a.*
    from public.attendance a
    cross join d
    where a.work_date = d.day and a.user_id in (select user_id from expected_users)
  ),
  counts as (
    select
      (select count(*) from expected_users)::integer as expected,
      (count(distinct user_id) filter (where session = 'check_in' and status = 'attend'))::integer as checked_in,
      (count(distinct user_id) filter (where session = 'check_in' and is_late))::integer as late,
      (count(distinct user_id) filter (where session = 'check_out' and status = 'attend'))::integer as checked_out,
      (count(distinct user_id) filter (where status = 'sick'))::integer as sick,
      (count(distinct user_id) filter (where status = 'excused'))::integer as excused
    from rows_today
  )
  select
    d.day,
    c.expected,
    c.checked_in,
    c.late,
    c.checked_out,
    c.sick,
    c.excused,
    greatest(c.expected - c.checked_in - c.sick - c.excused, 0),
    case when c.expected = 0 then null else round(100.0 * c.checked_in / c.expected, 1) end
  from counts c cross join d;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.schedule_swaps enable row level security;
alter table public.schedule_overrides enable row level security;

create policy "read own swaps or admin" on public.schedule_swaps
  for select to authenticated
  using (requester_id = (select auth.uid()) or partner_id = (select auth.uid()) or private.is_admin());
create policy "active employees request swaps" on public.schedule_swaps
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and private.current_user_role() = 'active_employee');
create policy "requester cancels pending swap" on public.schedule_swaps
  for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending');
create policy "admins review swaps" on public.schedule_swaps
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "read own overrides or admin" on public.schedule_overrides
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy "admins write overrides" on public.schedule_overrides
  for insert to authenticated with check (private.is_admin());
create policy "admins update overrides" on public.schedule_overrides
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

revoke all on public.schedule_swaps, public.schedule_overrides from anon, authenticated;
grant select, delete on public.schedule_swaps to authenticated;
grant insert (partner_id, work_date, note) on public.schedule_swaps to authenticated;
grant update (status, review_note, reviewed_by, reviewed_at, requester_shift, partner_shift) on public.schedule_swaps to authenticated;
grant select, insert, update on public.schedule_overrides to authenticated;
grant all on public.schedule_swaps, public.schedule_overrides to service_role;
