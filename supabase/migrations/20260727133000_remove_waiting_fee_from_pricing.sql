-- Remove waiting fee from the official server-side booking fare formula.
-- Waiting time may still be tracked operationally, but it no longer affects payment totals.

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

  return v_base_price + v_platform_fee + v_peak_fee + v_night_fee;
end;
$$;

revoke all on function app_private.calculate_booking_price_amount(numeric, numeric, time without time zone, integer) from public, anon, authenticated;

comment on function app_private.calculate_booking_price_amount(numeric, numeric, time without time zone, integer) is
  'Server-side booking price formula: route fare, platform fee, peak surcharge, night fee. Waiting fee is disabled.';