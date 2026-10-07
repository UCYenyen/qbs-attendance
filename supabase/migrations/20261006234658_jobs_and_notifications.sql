-- Scheduled jobs (pg_cron) and push-notification triggers (pg_net -> Edge Functions).
--
-- Required Vault secrets (see README / seed.sql for local values):
--   project_url  e.g. https://<ref>.supabase.co   (local: http://host.docker.internal:54321)
--   cron_secret  shared secret, must equal the CRON_SECRET edge function secret
--
-- pg_cron schedules are in UTC. Defaults assume Asia/Jakarta (UTC+7):
--   morning summary 10:00 WIB = 03:00 UTC, night summary 23:15 WIB = 16:15 UTC.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Fire-and-forget POST to an Edge Function. Silently skips when secrets are not configured.
create or replace function private.invoke_edge_function(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'invoke_edge_function(%): vault secrets project_url/cron_secret missing', p_name;
    return null;
  end if;

  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := p_body,
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function private.invoke_edge_function(text, jsonb) from public;

-- Notify admins whenever an employee submits a schedule for review.
create or replace function private.notify_schedule_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.invoke_edge_function(
    'notify-admins',
    jsonb_build_object('type', 'schedule_request', 'request_id', new.id, 'user_id', new.user_id)
  );
  return new;
end;
$$;

create trigger schedule_requests_notify after insert on public.schedule_requests
  for each row execute function private.notify_schedule_request();

-- Jobs (idempotent: cron.schedule upserts by job name).
select cron.schedule('mark-absences', '*/15 * * * *', $$select private.mark_absences()$$);

select cron.schedule(
  'morning-attendance-summary',
  '0 3 * * *',
  $$select private.invoke_edge_function('daily-attendance-summary', '{"period":"morning"}'::jsonb)$$
);

select cron.schedule(
  'night-attendance-summary',
  '15 16 * * *',
  $$select private.invoke_edge_function('daily-attendance-summary', '{"period":"night"}'::jsonb)$$
);
