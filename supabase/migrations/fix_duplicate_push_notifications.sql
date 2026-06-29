-- Migration: Fix duplicate push notifications
-- Applied: 2026-06-27
-- Description:
--   1. accept_booking RPC: Remove inline notification insert (DB trigger handles it)
--   2. notify_drivers_new_booking: Only notify drivers who are ONLINE + APPROVED
-- ============================================================================

-- Fix 1: Remove duplicate notification from accept_booking RPC
-- Notification is now handled exclusively by trigger notify_customer_booking_accepted
CREATE OR REPLACE FUNCTION public.accept_booking(p_booking_id uuid)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
      and exists (
        select 1 from public.vehicles v
        where v.driver_id = v_driver_id
          and coalesce(v.is_active, true) = true
          and v.status = 'Sẵn sàng'
      )
  ) into v_driver_ok;

  if not v_driver_ok then
    raise exception 'Bạn cần online, được duyệt và có xe đang hoạt động để nhận chuyến.' using errcode = '42501';
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

  -- NOTE: Notification for customer is handled by DB trigger
  -- app_private.notify_customer_booking_accepted which has NOT EXISTS guard.

  return v_booking;
end;
$$;

-- Fix 2: Only notify drivers who are ONLINE + APPROVED to reduce spam
CREATE OR REPLACE FUNCTION app_private.notify_drivers_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_booking_id
  )
  select
    p.id,
    'Có chuyến đi mới',
    'Khách hàng đặt chuyến từ ' || coalesce(new.pickup_location, 'điểm đón') || ' đến ' || coalesce(new.dropoff_location, 'điểm đến') || '.',
    'booking_update',
    false,
    new.id
  from public.profiles p
  inner join public.drivers d on d.profile_id = p.id
  where p.role = 'driver'
    and d.is_online = true
    and d.verification_status = 'APPROVED'
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = p.id
        and n.related_booking_id = new.id
        and n.type = 'booking_update'
        and n.title = 'Có chuyến đi mới'
    );

  return new;
end;
$$;
