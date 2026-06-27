create extension if not exists pg_cron with schema extensions;

create or replace function app_private.timeout_expired_booking_dispatches()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  update public.booking_dispatches
  set status = 'timeout',
      responded_at = now()
  where status = 'pending'
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function app_private.timeout_expired_booking_dispatches() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daigo_timeout_booking_dispatches') then
    perform cron.unschedule('daigo_timeout_booking_dispatches');
  end if;
end $$;

select cron.schedule(
  'daigo_timeout_booking_dispatches',
  '* * * * *',
  'select app_private.timeout_expired_booking_dispatches();'
);
