alter table public.drivers
  add column if not exists accepts_scheduled_bookings boolean not null default true;

create index if not exists drivers_accepts_scheduled_bookings_idx
  on public.drivers (accepts_scheduled_bookings)
  where accepts_scheduled_bookings = true;

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
    and coalesce(d.accepts_scheduled_bookings, true) = true
    and coalesce(v.is_active, true) = true
    and v.status = 'Sẵn sàng'
    and d.verification_status = 'APPROVED'
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

create or replace function public.accept_scheduled_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_booking public.bookings;
  v_driver_ok boolean;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để nhận chuyến.' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    join public.drivers d on d.profile_id = p.id
    where p.id = v_driver_id
      and p.role = 'driver'
      and d.verification_status = 'APPROVED'
      and coalesce(d.accepts_scheduled_bookings, true) = true
      and exists (
        select 1 from public.vehicles v
        where v.driver_id = v_driver_id
          and coalesce(v.is_active, true) = true
          and v.status = 'Sẵn sàng'
      )
  ) into v_driver_ok;

  if not v_driver_ok then
    raise exception 'Bạn cần được duyệt, bật nhận chuyến đặt trước và có xe đang hoạt động để nhận lịch.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.driver_id = v_driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Bạn đang có một chuyến đang hoạt động.' using errcode = '23514';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Không tìm thấy chuyến đặt trước.' using errcode = 'P0002';
  end if;

  if v_booking.booking_mode <> 'scheduled'
     or v_booking.status <> 'SCHEDULED_PENDING_DRIVER'
     or v_booking.driver_id is not null then
    raise exception 'Chuyến đặt trước này không còn khả dụng.' using errcode = '23505';
  end if;

  if v_booking.scheduled_response_deadline_at is not null
     and now() > v_booking.scheduled_response_deadline_at then
    raise exception 'Đã hết thời gian nhận chuyến đặt trước này.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.driver_schedules s
    where s.driver_id = v_driver_id
      and s.status in ('reserved', 'accepted', 'blocked')
      and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(v_booking.scheduled_start_at, v_booking.scheduled_end_at, '[)')
  ) then
    raise exception 'Bạn đã có lịch trong khung giờ này.' using errcode = '23505';
  end if;

  update public.bookings
  set driver_id = v_driver_id,
      status = 'SCHEDULED_DRIVER_ACCEPTED',
      scheduled_status = 'driver_accepted',
      locked = true,
      accepted_at = now(),
      updated_at = now()
  where id = p_booking_id
    and status = 'SCHEDULED_PENDING_DRIVER'
    and driver_id is null
  returning * into v_booking;

  if not found then
    raise exception 'Chuyến đặt trước này đã được tài xế khác nhận.' using errcode = '23505';
  end if;

  insert into public.driver_schedules (driver_id, booking_id, start_at, end_at, status)
  values (v_driver_id, p_booking_id, v_booking.scheduled_start_at, v_booking.scheduled_end_at, 'accepted')
  on conflict (booking_id, driver_id) do update
  set start_at = excluded.start_at,
      end_at = excluded.end_at,
      status = 'accepted',
      updated_at = now();

  update public.conversations
  set driver_id = v_driver_id,
      updated_at = now()
  where booking_id = p_booking_id;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (
    v_booking.customer_id,
    'Tài xế đã nhận chuyến đặt trước',
    'Tài xế đã xác nhận chuyến đặt trước của bạn.',
    'driver_confirm',
    false,
    p_booking_id
  );

  return v_booking;
end;
$$;

create or replace function public.notify_available_drivers_for_booking(p_booking_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Bạn cần đăng nhập để gửi thông báo chuyến đi.' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id;

  if not found then
    raise exception 'Không tìm thấy chuyến đi.' using errcode = 'P0002';
  end if;

  if v_booking.customer_id <> (select auth.uid()) then
    raise exception 'Bạn không có quyền gửi thông báo cho chuyến đi này.' using errcode = '42501';
  end if;

  if v_booking.driver_id is not null
     or v_booking.status not in ('SEARCHING_DRIVER', 'SCHEDULED_PENDING_DRIVER') then
    return 0;
  end if;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  select
    p.id,
    case
      when v_booking.booking_mode = 'scheduled' then 'Có chuyến đặt trước mới'
      else 'Có yêu cầu đặt xe mới'
    end,
    concat(
      'Tuyến: ',
      coalesce(v_booking.pickup_location, 'Điểm đón chưa rõ'),
      ' → ',
      coalesce(v_booking.dropoff_location, 'Điểm đến chưa rõ'),
      '. ',
      coalesce(v_booking.passengers, 1),
      ' khách',
      case
        when v_booking.booking_mode = 'scheduled' and v_booking.booking_time is not null
          then concat(', giờ đi ', v_booking.booking_time)
        else ''
      end,
      case
        when nullif(trim(coalesce(v_booking.note, '')), '') is not null
          then concat('. Ghi chú: ', v_booking.note)
        else ''
      end
    ),
    'booking_created',
    false,
    p_booking_id
  from public.profiles p
  join public.drivers d on d.profile_id = p.id
  where p.role = 'driver'
    and p.id <> v_booking.customer_id
    and (
      (v_booking.booking_mode <> 'scheduled' and d.is_online = true and d.verification_status = 'APPROVED')
      or (
        v_booking.booking_mode = 'scheduled'
        and d.verification_status = 'APPROVED'
        and coalesce(d.accepts_scheduled_bookings, true) = true
        and v_booking.scheduled_start_at is not null
        and v_booking.scheduled_end_at is not null
        and not exists (
          select 1
          from public.driver_schedules s
          where s.driver_id = p.id
            and s.status in ('reserved', 'accepted', 'blocked')
            and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(v_booking.scheduled_start_at, v_booking.scheduled_end_at, '[)')
        )
      )
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = p.id
        and n.related_booking_id = p_booking_id
        and n.type in ('booking_created', 'booking_update')
        and n.title in ('Có chuyến đặt trước mới', 'Có yêu cầu đặt xe mới')
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) from public, anon;
grant execute on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) to authenticated;
revoke all on function public.accept_scheduled_booking(uuid) from public, anon;
grant execute on function public.accept_scheduled_booking(uuid) to authenticated;
revoke all on function public.notify_available_drivers_for_booking(uuid) from public, anon;
grant execute on function public.notify_available_drivers_for_booking(uuid) to authenticated;
