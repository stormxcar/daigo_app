create schema if not exists app_private;

create or replace function app_private.calculate_booking_price_amount(
  p_distance numeric,
  p_price_per_km numeric,
  p_booking_time time without time zone,
  p_waiting_minutes integer default 0
)
returns integer
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_distance_fare integer;
  v_base_price integer;
  v_platform_fee integer;
  v_peak_fee integer;
  v_night_fee integer;
  v_waiting_fee integer;
  v_billable_waiting_minutes integer;
  v_hour integer;
begin
  v_distance_fare := round(greatest(coalesce(p_distance, 0), 0) * greatest(coalesce(p_price_per_km, 0), 0));
  v_base_price := greatest(v_distance_fare, 30000);
  v_platform_fee := floor(v_base_price * 0.10);
  v_hour := extract(hour from coalesce(p_booking_time, time '00:00'))::integer;

  if (v_hour >= 7 and v_hour < 9) or (v_hour >= 17 and v_hour < 20) then
    v_peak_fee := floor((v_base_price + v_platform_fee) * (1.2 - 1));
  else
    v_peak_fee := 0;
  end if;

  if v_hour >= 22 or v_hour < 5 then
    v_night_fee := floor(v_base_price * 0.12);
  else
    v_night_fee := 0;
  end if;

  v_billable_waiting_minutes := greatest(coalesce(p_waiting_minutes, 0) - 5, 0);
  v_waiting_fee := v_billable_waiting_minutes * 3000;

  return v_base_price + v_platform_fee + v_peak_fee + v_night_fee + v_waiting_fee;
end;
$$;

revoke all on function app_private.calculate_booking_price_amount(numeric, numeric, time without time zone, integer) from public, anon, authenticated;

create or replace function app_private.enforce_booking_price()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_price_per_km numeric;
  v_waiting_minutes integer := 0;
begin
  select price_per_km
  into v_price_per_km
  from public.vehicles
  where id = new.vehicle_id;

  if v_price_per_km is null then
    return new;
  end if;

  new.estimated_price := app_private.calculate_booking_price_amount(
    new.distance,
    v_price_per_km,
    new.booking_time,
    0
  );

  if new.status = 'TRIP_COMPLETED' then
    if new.arrived_at is not null and new.started_at is not null and new.started_at > new.arrived_at then
      v_waiting_minutes := ceil(extract(epoch from (new.started_at - new.arrived_at)) / 60.0)::integer;
    end if;

    new.actual_price := app_private.calculate_booking_price_amount(
      new.distance,
      v_price_per_km,
      new.booking_time,
      v_waiting_minutes
    );
  elsif new.status = 'CUSTOMER_CANCELLED' and new.cancelled_by = 'CUSTOMER' then
    if tg_op = 'UPDATE'
       and old.status in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED')
       and new.driver_id is not null then
      new.actual_price := ceil(new.estimated_price * 0.50)::integer;
    elsif coalesce(new.actual_price, 0) <= 0 then
      new.actual_price := null;
    end if;
  elsif new.status in ('DRIVER_CANCELLED', 'SCHEDULED_CANCELLED', 'SCHEDULED_DRIVER_REJECTED', 'EXPIRED') then
    new.actual_price := null;
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_booking_price() from public, anon, authenticated;

drop trigger if exists enforce_booking_price on public.bookings;
create trigger enforce_booking_price
before insert or update of vehicle_id, distance, booking_time, status, arrived_at, started_at, completed_at, cancelled_by
on public.bookings
for each row execute function app_private.enforce_booking_price();

comment on function app_private.calculate_booking_price_amount(numeric, numeric, time without time zone, integer) is
  'Server-side booking price formula: route fare, platform fee, peak surcharge, night fee, waiting fee.';
comment on trigger enforce_booking_price on public.bookings is
  'Normalizes booking estimated_price/actual_price server-side so mobile clients cannot tamper with final fare.';