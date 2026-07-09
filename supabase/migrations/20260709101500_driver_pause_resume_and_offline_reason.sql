alter table public.drivers
  add column if not exists offline_reason text;

alter table public.drivers
  add column if not exists pause_until timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drivers_offline_reason_check'
      and conrelid = 'public.drivers'::regclass
  ) then
    alter table public.drivers
      add constraint drivers_offline_reason_check
      check (offline_reason is null or offline_reason in ('manual', 'pause', 'system'));
  end if;
end $$;

create index if not exists drivers_pause_until_idx
  on public.drivers (pause_until)
  where pause_until is not null;

create index if not exists drivers_offline_pause_idx
  on public.drivers (offline_reason, pause_until)
  where offline_reason = 'pause';

create extension if not exists pg_cron with schema extensions;

create or replace function app_private.resume_paused_drivers()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  update public.drivers
  set is_online = true,
      pause_until = null,
      offline_reason = null
  where is_online = false
    and offline_reason = 'pause'
    and pause_until is not null
    and pause_until <= now()
    and verification_status = 'APPROVED'
    and current_latitude is not null
    and current_longitude is not null
    and coalesce(updated_location_at, now() - interval '100 years') >= now() - interval '2 hours';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function app_private.resume_paused_drivers() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daigo_resume_paused_drivers') then
    perform cron.unschedule('daigo_resume_paused_drivers');
  end if;
end $$;

select cron.schedule(
  'daigo_resume_paused_drivers',
  '* * * * *',
  'select app_private.resume_paused_drivers();'
);
