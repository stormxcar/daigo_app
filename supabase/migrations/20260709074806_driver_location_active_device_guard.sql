create or replace function public.upsert_driver_location_from_device(
  p_device_id text,
  p_booking_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_heading double precision default null,
  p_speed double precision default null,
  p_accuracy double precision default null,
  p_phase text default 'pickup'
)
returns public.driver_locations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_location public.driver_locations;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật vị trí.' using errcode = '42501';
  end if;

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

  if not exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.driver_id = v_driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
  ) then
    raise exception 'Bạn không có quyền cập nhật vị trí cho chuyến này.' using errcode = '42501';
  end if;

  insert into public.driver_locations (
    booking_id,
    driver_id,
    latitude,
    longitude,
    heading,
    speed,
    accuracy,
    phase,
    updated_at
  ) values (
    p_booking_id,
    v_driver_id,
    p_latitude,
    p_longitude,
    p_heading,
    p_speed,
    p_accuracy,
    case when p_phase in ('pickup', 'dropoff') then p_phase else 'pickup' end,
    now()
  )
  on conflict (booking_id) do update
  set driver_id = excluded.driver_id,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      heading = excluded.heading,
      speed = excluded.speed,
      accuracy = excluded.accuracy,
      phase = excluded.phase,
      updated_at = now()
  returning * into v_location;

  return v_location;
end;
$$;

revoke all on function public.upsert_driver_location_from_device(text, uuid, double precision, double precision, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.upsert_driver_location_from_device(text, uuid, double precision, double precision, double precision, double precision, double precision, text) to authenticated;
