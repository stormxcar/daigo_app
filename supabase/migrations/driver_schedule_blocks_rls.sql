drop policy if exists "Drivers insert own schedule blocks" on public.driver_schedules;
create policy "Drivers insert own schedule blocks"
on public.driver_schedules
for insert
to authenticated
with check (
  driver_id = (select auth.uid())
  and status = 'blocked'
  and booking_id is null
);

drop policy if exists "Drivers delete own schedule blocks" on public.driver_schedules;
create policy "Drivers delete own schedule blocks"
on public.driver_schedules
for delete
to authenticated
using (
  driver_id = (select auth.uid())
  and status = 'blocked'
);

create or replace function public.find_available_drivers(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_pickup_lat double precision default null,
  p_pickup_lng double precision default null
)
returns table (
  driver_id uuid,
  vehicle_id uuid
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select distinct on (p.id)
    p.id as driver_id,
    v.id as vehicle_id
  from public.profiles p
  join public.drivers d on d.profile_id = p.id
  join public.vehicles v on v.driver_id = p.id
  where p.role = 'driver'
    and coalesce(v.is_active, true) = true
    and v.status = 'Sẵn sàng'
    and d.verification_status in ('APPROVED', 'PENDING')
    and not exists (
      select 1
      from public.driver_schedules s
      where s.driver_id = p.id
        and s.status in ('reserved', 'accepted', 'blocked')
        and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
    and not exists (
      select 1
      from public.bookings b
      where b.driver_id = p.id
        and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
    )
  order by
    p.id,
    case
      when p_pickup_lat is not null
       and p_pickup_lng is not null
       and d.current_latitude is not null
       and d.current_longitude is not null
      then
        power(d.current_latitude - p_pickup_lat, 2)
        + power(d.current_longitude - p_pickup_lng, 2)
      else null
    end asc nulls last,
    v.created_at asc;
$$;

revoke all on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) from public, anon;
grant execute on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) to authenticated;
