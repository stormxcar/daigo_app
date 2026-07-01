alter table public.driver_schedules
  alter column booking_id drop not null;

alter table public.driver_schedules
  drop constraint if exists driver_schedules_status_check,
  add constraint driver_schedules_status_check
    check (status in ('reserved', 'accepted', 'cancelled', 'completed', 'blocked'));

alter table public.driver_schedules
  drop constraint if exists driver_schedules_booking_required_check,
  add constraint driver_schedules_booking_required_check
    check (
      (status = 'blocked' and booking_id is null)
      or (status <> 'blocked' and booking_id is not null)
    );

alter table public.driver_schedules
  drop constraint if exists driver_schedules_no_overlap;

alter table public.driver_schedules
  add constraint driver_schedules_no_overlap
  exclude using gist (
    driver_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status in ('reserved', 'accepted', 'blocked'));

create index if not exists driver_schedules_driver_status_start_idx
on public.driver_schedules (driver_id, status, start_at);
