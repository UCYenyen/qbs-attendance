-- Owner-created accounts: login by username or email, owner-set default password.

alter table public.profiles
  add column username text,
  add column must_change_password boolean not null default false,
  add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9._]{3,30}$');

-- Case-insensitive uniqueness (usernames are stored lowercase by the app).
create unique index profiles_username_key on public.profiles (lower(username));

-- Users can't change their own username or the must-change flag (server code does, with the secret key).
-- The existing column grants on profiles (full_name, avatar_url, role) already exclude both columns.

-- employee_summary now also returns the username (return type change => drop + create).
drop function if exists public.employee_summary(date, date);

create function public.employee_summary(p_from date, p_to date)
returns table (
  user_id uuid,
  full_name text,
  email text,
  username text,
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
    p.username,
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
  where p.role not in ('admin', 'admin_qr')
  order by p.full_name, p.email;
$$;

revoke all on function public.employee_summary(date, date) from public, anon;
grant execute on function public.employee_summary(date, date) to authenticated, service_role;
