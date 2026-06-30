create or replace function public.driver_transition_booking(
  p_booking_id uuid,
  p_action text,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_booking public.bookings;
  v_target_status text;
  v_notification_title text;
  v_notification_content text;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật chuyến.' using errcode = '42501';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Không tìm thấy chuyến đi.' using errcode = 'P0002';
  end if;

  if v_booking.driver_id is distinct from v_driver_id then
    raise exception 'Bạn không phải tài xế của chuyến này.' using errcode = '42501';
  end if;

  if p_action = 'mark_arriving' then
    v_target_status := 'DRIVER_ARRIVING';
    if v_booking.status = v_target_status then
      return v_booking;
    end if;
    if v_booking.status not in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING') then
      raise exception 'Không thể chuyển sang trạng thái đang tới từ trạng thái hiện tại.' using errcode = '23514';
    end if;

    update public.bookings
    set status = v_target_status,
        arriving_at = coalesce(arriving_at, now()),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

    v_notification_title := 'Tài xế đang tới';
    v_notification_content := 'Tài xế đang di chuyển đến điểm đón.';

  elsif p_action = 'mark_arrived' then
    v_target_status := 'DRIVER_ARRIVED';
    if v_booking.status = v_target_status then
      return v_booking;
    end if;
    if v_booking.status <> 'DRIVER_ARRIVING' then
      raise exception 'Không thể xác nhận đã tới nơi từ trạng thái hiện tại.' using errcode = '23514';
    end if;

    update public.bookings
    set status = v_target_status,
        arrived_at = coalesce(arrived_at, now()),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

    v_notification_title := 'Tài xế đã đến điểm đón';
    v_notification_content := 'Tài xế đã đến điểm đón. Vui lòng ra xe.';

  elsif p_action = 'start_trip' then
    v_target_status := 'TRIP_STARTED';
    if v_booking.status = v_target_status then
      return v_booking;
    end if;
    if v_booking.status <> 'DRIVER_ARRIVED' then
      raise exception 'Không thể bắt đầu chuyến từ trạng thái hiện tại.' using errcode = '23514';
    end if;

    update public.bookings
    set status = v_target_status,
        started_at = coalesce(started_at, now()),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

    v_notification_title := 'Chuyến đi đã bắt đầu';
    v_notification_content := 'Chuyến đi của bạn đã bắt đầu.';

  elsif p_action = 'complete_trip' then
    v_target_status := 'TRIP_COMPLETED';
    if v_booking.status = v_target_status then
      return v_booking;
    end if;
    if v_booking.status <> 'TRIP_STARTED' then
      raise exception 'Không thể hoàn thành chuyến từ trạng thái hiện tại.' using errcode = '23514';
    end if;

    update public.bookings
    set status = v_target_status,
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

    insert into public.trip_history (
      booking_id,
      customer_id,
      driver_id,
      pickup_address,
      dropoff_address,
      started_at,
      completed_at
    )
    select
      v_booking.id,
      v_booking.customer_id,
      v_booking.driver_id,
      v_booking.pickup_location,
      v_booking.dropoff_location,
      v_booking.started_at,
      coalesce(v_booking.completed_at, now())
    where not exists (
      select 1 from public.trip_history h where h.booking_id = v_booking.id
    );

    v_notification_title := 'Chuyến đi đã hoàn thành';
    v_notification_content := 'Chuyến đi đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ.';

  elsif p_action = 'cancel_by_driver' then
    v_target_status := 'DRIVER_CANCELLED';
    if v_booking.status = v_target_status then
      return v_booking;
    end if;
    if v_booking.status not in (
      'DRIVER_ACCEPTED',
      'SCHEDULED_DRIVER_ACCEPTED',
      'SCHEDULED_UPCOMING',
      'DRIVER_ARRIVING',
      'DRIVER_ARRIVED'
    ) then
      raise exception 'Không thể hủy chuyến ở trạng thái hiện tại.' using errcode = '23514';
    end if;
    if v_booking.booking_mode = 'scheduled'
       and v_booking.scheduled_start_at is not null
       and now() >= v_booking.scheduled_start_at then
      raise exception 'Chuyến đặt trước đã đến giờ thao tác. Vui lòng cập nhật trạng thái chuyến thay vì hủy.' using errcode = '23514';
    end if;

    update public.bookings
    set status = v_target_status,
        cancelled_by = 'DRIVER',
        cancel_reason = nullif(trim(coalesce(p_reason, '')), ''),
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;

    v_notification_title := 'Tài xế đã hủy chuyến';
    v_notification_content := coalesce(
      'Tài xế đã hủy chuyến. Lý do: ' || nullif(trim(coalesce(p_reason, '')), ''),
      'Tài xế đã hủy chuyến. Bạn có thể đặt lại chuyến mới.'
    );

  else
    raise exception 'Hành động chuyến đi không hợp lệ.' using errcode = '22023';
  end if;

  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_booking_id
  )
  values (
    v_booking.customer_id,
    v_notification_title,
    v_notification_content,
    case
      when p_action = 'complete_trip' then 'trip_done'
      when p_action = 'cancel_by_driver' then 'driver_cancel'
      else 'booking_update'
    end,
    false,
    v_booking.id
  );

  return v_booking;
end;
$$;

revoke all on function public.driver_transition_booking(uuid, text, text) from public, anon;
grant execute on function public.driver_transition_booking(uuid, text, text) to authenticated;
