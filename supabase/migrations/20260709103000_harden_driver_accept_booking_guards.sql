create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver_id uuid := auth.uid();
  v_booking public.bookings;
  v_dispatch public.booking_dispatches;
  v_driver_ok boolean;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để nhận chuyến.' using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles p
    join public.drivers d on d.profile_id = p.id
    where p.id = v_driver_id
      and p.role = 'driver'
      and d.is_online = true
      and d.verification_status = 'APPROVED'
      and d.offline_reason is distinct from 'pause'
      and (d.pause_until is null or d.pause_until <= now())
      and exists (
        select 1 from public.vehicles v
        where v.driver_id = v_driver_id
          and coalesce(v.is_active, true) = true
          and v.status = 'Sẵn sàng'
      )
  ) into v_driver_ok;

  if not v_driver_ok then
    raise exception 'Bạn cần online, không tạm nghỉ, được duyệt và có xe đang hoạt động để nhận chuyến.' using errcode = '42501';
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
  into v_dispatch
  from public.booking_dispatches d
  where d.booking_id = p_booking_id
    and d.driver_id = v_driver_id
    and d.status = 'pending'
    and d.expires_at > now()
  order by d.created_at asc
  limit 1
  for update;

  if not found and exists (
    select 1
    from public.booking_dispatches d
    where d.booking_id = p_booking_id
      and d.status = 'pending'
      and d.expires_at > now()
  ) then
    raise exception 'Chuyến này đang được gửi tới tài xế khác.' using errcode = '42501';
  end if;

  update public.bookings b
  set status = 'DRIVER_ACCEPTED',
      driver_id = v_driver_id,
      locked = true,
      accepted_at = now(),
      updated_at = now()
  where b.id = p_booking_id
    and b.status = 'SEARCHING_DRIVER'
    and b.driver_id is null
  returning * into v_booking;

  if not found then
    raise exception 'Chuyến này đã được tài xế khác nhận.' using errcode = '23505';
  end if;

  if v_dispatch.id is not null then
    update public.booking_dispatches
    set status = 'accepted',
        responded_at = now()
    where id = v_dispatch.id;
  end if;

  update public.conversations
  set driver_id = v_driver_id,
      updated_at = now()
  where booking_id = p_booking_id;

  return v_booking;
end;
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
      and d.is_online = true
      and d.verification_status = 'APPROVED'
      and d.offline_reason is distinct from 'pause'
      and (d.pause_until is null or d.pause_until <= now())
      and exists (
        select 1 from public.vehicles v
        where v.driver_id = v_driver_id
          and coalesce(v.is_active, true) = true
          and v.status = 'Sẵn sàng'
      )
  ) into v_driver_ok;

  if not v_driver_ok then
    raise exception 'Bạn cần online, không tạm nghỉ, được duyệt và có xe đang hoạt động để nhận chuyến đặt trước.' using errcode = '42501';
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
      and s.status in ('reserved', 'accepted')
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

revoke all on function public.accept_booking(uuid) from public, anon;
grant execute on function public.accept_booking(uuid) to authenticated;
revoke all on function public.accept_scheduled_booking(uuid) from public, anon;
grant execute on function public.accept_scheduled_booking(uuid) to authenticated;
