-- QBS Presence: core schema, RLS, stats + review functions.
-- Weekdays follow Postgres `extract(dow)` / JS `Date#getDay()`: 0 = Sunday … 6 = Saturday.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'active_employee', 'inactive_employee');
create type public.attendance_status as enum ('attend', 'excused', 'sick', 'absence');
create type public.attendance_session as enum ('check_in', 'check_out');
create type public.request_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Asia/Jakarta',
  late_grace_minutes integer not null default 15 check (late_grace_minutes >= 0),
  window_before_min integer not null default 60 check (window_before_min >= 0),
  window_after_min integer not null default 120 check (window_after_min > 0),
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'inactive_employee',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- Approved schedule (one row per weekday). Only written by review_schedule_request().
create table public.schedules (
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_working_day boolean not null default true,
  start_time time not null default '08:00',
  end_time time not null default '21:00',
  approved_at timestamptz not null default now(),
  primary key (user_id, weekday),
  check (end_time > start_time)
);

create table public.schedule_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  items jsonb not null,
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- An employee can't submit again until the admin reviews the pending request.
create unique index schedule_requests_one_pending_idx
  on public.schedule_requests (user_id) where status = 'pending';
create index schedule_requests_status_idx on public.schedule_requests (status, created_at desc);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  session public.attendance_session not null,
  status public.attendance_status not null,
  is_late boolean not null default false,
  note text,
  -- Cloudinary public_id of the selfie (scan) or supporting document (sick/excused).
  proof_of_attendance text,
  proof_resource_type text check (proof_resource_type in ('image', 'raw', 'video')),
  created_at timestamptz not null default now(), -- the moment the employee scanned
  updated_at timestamptz not null default now(),
  unique (user_id, work_date, session)
);
create index attendance_work_date_idx on public.attendance (work_date);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the Data API)
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.current_user_role() from public;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;

create or replace function private.local_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone s.timezone)::date from public.app_settings s;
$$;
grant execute on function private.local_today() to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger attendance_updated_at before update on public.attendance
  for each row execute function private.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function private.set_updated_at();

-- New auth user -> profile. Everyone starts inactive; the invite action promotes them.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Only admins (or server-side service code, where auth.uid() is null) may change roles.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'Hanya admin yang bisa mengubah peran' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and (select auth.uid()) is not null then
    raise exception 'Email dikelola oleh sistem autentikasi' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function private.guard_profile_role();

-- Validate the 7-day schedule payload at insert time.
create or replace function private.validate_schedule_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_distinct integer;
  v_invalid integer;
begin
  if jsonb_typeof(new.items) <> 'array' then
    raise exception 'Data jadwal harus berupa array' using errcode = '22023';
  end if;

  select count(*), count(distinct x.weekday),
         count(*) filter (
           where x.weekday not between 0 and 6
              or x.is_working_day is null
              or (x.is_working_day and (x.start_time is null or x.end_time is null or x.end_time <= x.start_time))
         )
    into v_count, v_distinct, v_invalid
  from jsonb_to_recordset(new.items) as x(weekday smallint, is_working_day boolean, start_time time, end_time time);

  if v_count <> 7 or v_distinct <> 7 or v_invalid > 0 then
    raise exception 'Jadwal harus berisi 7 hari yang valid (jam selesai setelah jam mulai)' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger schedule_requests_validate before insert or update of items on public.schedule_requests
  for each row execute function private.validate_schedule_items();

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
-- One row per employee per day. A day counts as `attend` if either session was attended.
create view public.attendance_days
with (security_invoker = true)
as
select
  t.user_id,
  t.work_date,
  t.status,
  t.is_late,
  t.check_in_at,
  t.check_out_at,
  case
    when t.check_in_at is not null and t.check_out_at is not null and t.check_out_at > t.check_in_at
      then round((extract(epoch from (t.check_out_at - t.check_in_at)) / 3600)::numeric, 2)
  end as worked_hours
from (
  select
    a.user_id,
    a.work_date,
    case
      when bool_or(a.status = 'attend') then 'attend'
      when bool_or(a.status = 'sick') then 'sick'
      when bool_or(a.status = 'excused') then 'excused'
      else 'absence'
    end::public.attendance_status as status,
    coalesce(bool_or(a.is_late) filter (where a.session = 'check_in'), false) as is_late,
    max(a.created_at) filter (where a.session = 'check_in' and a.status = 'attend') as check_in_at,
    max(a.created_at) filter (where a.session = 'check_out' and a.status = 'attend') as check_out_at
  from public.attendance a
  group by a.user_id, a.work_date
) t;

-- ---------------------------------------------------------------------------
-- RPCs (security invoker: RLS decides what each caller sees)
-- ---------------------------------------------------------------------------
create or replace function public.review_schedule_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.schedule_requests;
begin
  if not private.is_admin() then
    raise exception 'Hanya admin yang bisa mereview jadwal' using errcode = '42501';
  end if;

  select * into v_request
  from public.schedule_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan atau sudah direview' using errcode = 'P0002';
  end if;

  update public.schedule_requests
  set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
      review_note = nullif(trim(p_note), ''),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = v_request.id;

  if p_approve then
    insert into public.schedules (user_id, weekday, is_working_day, start_time, end_time, approved_at)
    select v_request.user_id,
           x.weekday,
           x.is_working_day,
           coalesce(x.start_time, '08:00'),
           coalesce(x.end_time, '21:00'),
           now()
    from jsonb_to_recordset(v_request.items)
      as x(weekday smallint, is_working_day boolean, start_time time, end_time time)
    on conflict (user_id, weekday) do update
      set is_working_day = excluded.is_working_day,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          approved_at = excluded.approved_at;
  end if;
end;
$$;

-- Time series for charts. p_user_id null = all employees combined.
create or replace function public.attendance_series(
  p_granularity text,
  p_from date,
  p_to date,
  p_user_id uuid default null
)
returns table (
  bucket date,
  scheduled integer,
  attended integer,
  late integer,
  sick integer,
  excused integer,
  absent integer,
  attendance_rate numeric,
  worked_hours numeric,
  avg_worked_hours numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_step interval;
begin
  if p_granularity not in ('day', 'week', 'month', 'year') then
    raise exception 'Granularitas tidak valid: %', p_granularity using errcode = '22023';
  end if;
  if p_to < p_from then
    raise exception 'Tanggal akhir harus sama atau setelah tanggal awal' using errcode = '22023';
  end if;
  v_step := ('1 ' || p_granularity)::interval;

  return query
  with buckets as (
    select g::date as bucket
    from generate_series(date_trunc(p_granularity, p_from::timestamp), p_to::timestamp, v_step) g
  ),
  agg as (
    select
      date_trunc(p_granularity, d.work_date::timestamp)::date as bucket,
      count(*)::integer as scheduled,
      (count(*) filter (where d.status = 'attend'))::integer as attended,
      (count(*) filter (where d.is_late))::integer as late,
      (count(*) filter (where d.status = 'sick'))::integer as sick,
      (count(*) filter (where d.status = 'excused'))::integer as excused,
      (count(*) filter (where d.status = 'absence'))::integer as absent,
      coalesce(sum(d.worked_hours), 0)::numeric as worked_hours,
      avg(d.worked_hours)::numeric as avg_worked_hours
    from public.attendance_days d
    join public.profiles p on p.id = d.user_id and p.role <> 'admin'
    where d.work_date between p_from and p_to
      and (p_user_id is null or d.user_id = p_user_id)
    group by 1
  )
  select
    b.bucket,
    coalesce(a.scheduled, 0),
    coalesce(a.attended, 0),
    coalesce(a.late, 0),
    coalesce(a.sick, 0),
    coalesce(a.excused, 0),
    coalesce(a.absent, 0),
    case when coalesce(a.scheduled, 0) = 0 then null
         else round(100.0 * a.attended / a.scheduled, 1) end,
    round(coalesce(a.worked_hours, 0), 2),
    round(a.avg_worked_hours, 2)
  from buckets b
  left join agg a using (bucket)
  order by b.bucket;
end;
$$;

-- Per-employee totals for the employees table.
create or replace function public.employee_summary(p_from date, p_to date)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.user_role,
  scheduled integer,
  attended integer,
  late integer,
  sick integer,
  excused integer,
  absent integer,
  attendance_rate numeric,
  worked_hours numeric,
  has_schedule boolean,
  has_pending_request boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    coalesce(s.scheduled, 0),
    coalesce(s.attended, 0),
    coalesce(s.late, 0),
    coalesce(s.sick, 0),
    coalesce(s.excused, 0),
    coalesce(s.absent, 0),
    case when coalesce(s.scheduled, 0) = 0 then null
         else round(100.0 * s.attended / s.scheduled, 1) end,
    round(coalesce(s.worked_hours, 0), 2),
    exists (select 1 from public.schedules sc where sc.user_id = p.id),
    exists (select 1 from public.schedule_requests r where r.user_id = p.id and r.status = 'pending')
  from public.profiles p
  left join lateral (
    select
      count(*)::integer as scheduled,
      (count(*) filter (where d.status = 'attend'))::integer as attended,
      (count(*) filter (where d.is_late))::integer as late,
      (count(*) filter (where d.status = 'sick'))::integer as sick,
      (count(*) filter (where d.status = 'excused'))::integer as excused,
      (count(*) filter (where d.status = 'absence'))::integer as absent,
      sum(d.worked_hours)::numeric as worked_hours
    from public.attendance_days d
    where d.user_id = p.id and d.work_date between p_from and p_to
  ) s on true
  where p.role <> 'admin'
  order by p.full_name, p.email;
$$;

-- Today's headline numbers (dashboard cards + cron push).
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
    select s.user_id
    from public.schedules s
    join public.profiles p on p.id = s.user_id and p.role = 'active_employee'
    cross join d
    where s.is_working_day and s.weekday = extract(dow from d.day)::integer
    union
    select a.user_id
    from public.attendance a
    join public.profiles p on p.id = a.user_id and p.role <> 'admin'
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
-- Absence marking (run by pg_cron as postgres)
-- ---------------------------------------------------------------------------
-- Inserts `absence` for every scheduled session whose scan window has closed with no row.
-- Looks at yesterday too, so late-night windows that close after midnight are covered.
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
      s.user_id,
      days.day,
      v.session,
      days.day + case when v.session = 'check_in' then s.start_time else s.end_time end as expected_at,
      s.approved_at
    from public.schedules s
    join public.profiles p on p.id = s.user_id and p.role = 'active_employee'
    cross join days
    cross join (values ('check_in'::public.attendance_session), ('check_out'::public.attendance_session)) v(session)
    where s.is_working_day and s.weekday = extract(dow from days.day)::integer
  )
  insert into public.attendance (user_id, work_date, session, status)
  select c.user_id, c.day, c.session, 'absence'
  from candidates c, cfg
  where cfg.local_now > c.expected_at + make_interval(mins => cfg.window_after_min)
    -- don't mark sessions whose window opened before the schedule was approved
    and ((c.expected_at - make_interval(mins => cfg.window_before_min)) at time zone cfg.timezone) >= c.approved_at
  on conflict (user_id, work_date, session) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke all on function private.mark_absences() from public;
grant execute on function private.mark_absences() to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_requests enable row level security;
alter table public.attendance enable row level security;
alter table public.push_subscriptions enable row level security;

-- app_settings
create policy "settings readable by signed-in users" on public.app_settings
  for select to authenticated using (true);
create policy "settings editable by admins" on public.app_settings
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- profiles
create policy "read own profile or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admins update profiles" on public.profiles
  for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- schedules
create policy "read own schedule or admin" on public.schedules
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy "admins write schedules" on public.schedules
  for insert to authenticated with check (private.is_admin());
create policy "admins update schedules" on public.schedules
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- schedule_requests
create policy "read own requests or admin" on public.schedule_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy "active employees submit own request" on public.schedule_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and private.current_user_role() = 'active_employee'
  );
create policy "admins review requests" on public.schedule_requests
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- attendance: no client inserts. Scans/leave are written server-side with the secret key.
create policy "read own attendance or admin" on public.attendance
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy "admins correct attendance" on public.attendance
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- push_subscriptions
create policy "manage own push subscriptions (select)" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "manage own push subscriptions (insert)" on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "manage own push subscriptions (delete)" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (tables are not exposed to the Data API automatically)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon;

grant select on public.app_settings to authenticated;
grant update (timezone, late_grace_minutes, window_before_min, window_after_min) on public.app_settings to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, role) on public.profiles to authenticated;

grant select on public.schedules to authenticated;
grant insert, update on public.schedules to authenticated;

grant select on public.schedule_requests to authenticated;
grant insert (user_id, items) on public.schedule_requests to authenticated;
grant update (status, review_note, reviewed_by, reviewed_at) on public.schedule_requests to authenticated;

grant select on public.attendance to authenticated;
grant update (status, note, is_late) on public.attendance to authenticated;

grant select, insert, delete on public.push_subscriptions to authenticated;

grant select on public.attendance_days to authenticated;

grant all on all tables in schema public to service_role;

grant execute on function public.review_schedule_request(uuid, boolean, text) to authenticated;
grant execute on function public.attendance_series(text, date, date, uuid) to authenticated, service_role;
grant execute on function public.employee_summary(date, date) to authenticated, service_role;
grant execute on function public.today_summary(date) to authenticated, service_role;
