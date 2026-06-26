-- Prevent scheduled trips from being progressed before their allowed action window.

create or replace function app_private.prevent_early_scheduled_trip_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.booking_mode = 'scheduled'
     and new.status in ('DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED')
     and new.scheduled_start_at is not null
     and now() < new.scheduled_start_at then
    raise exception 'Chuyến đặt trước chỉ có thể thao tác từ %.', new.scheduled_start_at
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_early_scheduled_trip_progress on public.bookings;
create trigger prevent_early_scheduled_trip_progress
before update of status on public.bookings
for each row execute function app_private.prevent_early_scheduled_trip_progress();
