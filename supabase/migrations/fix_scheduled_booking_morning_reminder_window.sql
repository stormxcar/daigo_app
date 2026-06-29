-- Fix Tier 2 scheduled booking reminders:
-- send once during 6-9 AM Vietnam time on the travel day, regardless of pickup hour.
-- Also use scheduled_start_at as the pickup anchor for reminder/expiry timing.

create or replace function app_private.send_scheduled_booking_reminders()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking record;
  v_pickup_at timestamptz;
  v_now timestamptz := now();
begin
  for v_booking in
    select *
    from public.bookings
    where booking_mode = 'scheduled'
      and status in ('SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
      and scheduled_start_at is not null
      and driver_id is not null
  loop
    v_pickup_at := v_booking.scheduled_start_at;

    if v_booking.reminder_1day_sent_at is null
       and v_now >= v_pickup_at - interval '24 hours'
       and v_now <  v_pickup_at - interval '23 hours'
    then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (v_booking.customer_id, 'Nhắc nhở: Chuyến xe ngày mai',
         'Bạn có chuyến xe đặt trước vào ngày mai. Hãy chuẩn bị sẵn sàng!',
         'scheduled_reminder', false, v_booking.id),
        (v_booking.driver_id, 'Nhắc nhở: Chuyến đặt trước ngày mai',
         'Bạn có chuyến đặt trước vào ngày mai. Đảm bảo xe sẵn sàng trước giờ đón.',
         'scheduled_reminder', false, v_booking.id);
      update public.bookings set reminder_1day_sent_at = v_now, updated_at = v_now where id = v_booking.id;
    end if;

    if v_booking.reminder_morning_sent_at is null
       and (v_now at time zone 'Asia/Ho_Chi_Minh')::date = (v_pickup_at at time zone 'Asia/Ho_Chi_Minh')::date
       and extract(hour from v_now at time zone 'Asia/Ho_Chi_Minh') between 6 and 9
       and v_now < v_pickup_at
    then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (v_booking.customer_id, 'Hôm nay bạn có chuyến đặt trước',
         'Chuyến xe của bạn sẽ diễn ra hôm nay. Tài xế đã sẵn sàng đón bạn.',
         'scheduled_reminder', false, v_booking.id),
        (v_booking.driver_id, 'Hôm nay bạn có chuyến đặt trước',
         'Đừng quên chuyến xe được đặt trước hôm nay. Hãy kiểm tra lộ trình và chuẩn bị.',
         'scheduled_reminder', false, v_booking.id);
      update public.bookings set reminder_morning_sent_at = v_now, updated_at = v_now where id = v_booking.id;
    end if;

    if v_booking.reminder_30_sent_at is null
       and v_now >= v_pickup_at - interval '30 minutes'
       and v_now <  v_pickup_at - interval '10 minutes'
    then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (v_booking.customer_id, 'Chuyến đặt trước sắp diễn ra',
         'Chuyến xe của bạn sẽ bắt đầu sau khoảng 30 phút.',
         'scheduled_reminder', false, v_booking.id),
        (v_booking.driver_id, 'Chuẩn bị chuyến đặt trước',
         'Bạn có chuyến đặt trước cần chuẩn bị sau khoảng 30 phút.',
         'scheduled_reminder', false, v_booking.id);
      update public.bookings set reminder_30_sent_at = v_now, updated_at = v_now where id = v_booking.id;
    end if;

    if v_booking.reminder_10_sent_at is null
       and v_now >= v_pickup_at - interval '10 minutes'
       and v_now <  v_pickup_at
    then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (v_booking.customer_id, 'Tài xế sắp đến giờ đón',
         'Chuyến xe đặt trước sẽ bắt đầu sau khoảng 10 phút.',
         'scheduled_reminder', false, v_booking.id),
        (v_booking.driver_id, 'Đến giờ chuẩn bị đón khách',
         'Chuyến đặt trước sẽ bắt đầu sau khoảng 10 phút. Hãy mở lộ trình và di chuyển tới điểm đón.',
         'scheduled_reminder', false, v_booking.id);
      update public.bookings
      set reminder_10_sent_at = v_now,
          status = case when status = 'SCHEDULED_DRIVER_ACCEPTED' then 'SCHEDULED_UPCOMING' else status end,
          scheduled_status = 'upcoming',
          updated_at = v_now
      where id = v_booking.id;
    end if;
  end loop;
end;
$$;

create or replace function app_private.expire_missed_scheduled_bookings()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking record;
  v_pickup_deadline timestamptz;
begin
  for v_booking in
    select *
    from public.bookings
    where booking_mode = 'scheduled'
      and status in ('SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
      and scheduled_start_at is not null
      and driver_id is not null
  loop
    v_pickup_deadline := v_booking.scheduled_start_at + interval '60 minutes';

    if now() > v_pickup_deadline then
      update public.bookings
      set status = 'EXPIRED',
          cancelled_at = now(),
          cancel_reason = 'Chuyến đặt trước đã quá giờ và không được thực hiện.',
          updated_at = now()
      where id = v_booking.id;

      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (v_booking.customer_id, 'Chuyến đặt trước đã hết hạn',
         'Chuyến xe của bạn đã quá giờ và được hủy tự động. Vui lòng đặt chuyến mới nếu cần.',
         'booking_cancelled', false, v_booking.id),
        (v_booking.driver_id, 'Chuyến đặt trước đã hết hạn',
         'Chuyến đặt trước đã quá giờ và bị hủy tự động vì không có thông báo bắt đầu chuyến.',
         'booking_cancelled', false, v_booking.id);
    end if;
  end loop;
end;
$$;
