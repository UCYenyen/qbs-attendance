-- admin_qr accounts are staff tools, not employees: keep them out of attendance stats.

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
    join public.profiles p on p.id = d.user_id and p.role not in ('admin', 'admin_qr')
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
  where p.role not in ('admin', 'admin_qr')
  order by p.full_name, p.email;
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
    select s.user_id
    from public.schedules s
    join public.profiles p on p.id = s.user_id and p.role = 'active_employee'
    cross join d
    where s.is_working_day and s.weekday = extract(dow from d.day)::integer
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
