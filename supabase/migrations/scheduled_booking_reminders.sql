-- Scheduled booking reminder notifications. Notifications trigger Expo push via existing notification trigger.

create extension if not exists pg_cron with schema extensions;

alter table public.bookings
  add column if not exists reminder_30_sent_at timestamptz,
  add column if not exists reminder_10_sent_at timestamptz;

create or replace function app_private.send_scheduled_booking_reminders()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking record;
  v_pickup_at timestamptz;
begin
  for v_booking in
    select *
    from public.bookings
    where booking_mode = 'scheduled'
      and driver_id is not null
      and status in ('SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
      and scheduled_start_at is not null
  loop
    v_pickup_at := v_booking.scheduled_start_at + make_interval(mins => coalesce(v_booking.buffer_before_minutes, 15));

    if v_booking.reminder_30_sent_at is null
       and now() < v_pickup_at - interval '10 minutes'
       and now() >= v_pickup_at - interval '30 minutes'
       and now() < v_pickup_at then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (
          v_booking.customer_id,
          'Chuyến đặt trước sắp diễn ra',
          'Chuyến xe của bạn sẽ bắt đầu sau khoảng 30 phút.',
          'booking_update',
          false,
          v_booking.id
        ),
        (
          v_booking.driver_id,
          'Chuẩn bị chuyến đặt trước',
          'Bạn có chuyến đặt trước cần chuẩn bị sau khoảng 30 phút.',
          'booking_update',
          false,
          v_booking.id
        );

      update public.bookings
      set reminder_30_sent_at = now(),
          updated_at = now()
      where id = v_booking.id;
    end if;

    if v_booking.reminder_10_sent_at is null
       and now() >= v_pickup_at - interval '10 minutes'
       and now() < v_pickup_at then
      insert into public.notifications (user_id, title, content, type, read, related_booking_id)
      values
        (
          v_booking.customer_id,
          'Tài xế sắp đến giờ đón',
          'Chuyến xe đặt trước sẽ bắt đầu sau khoảng 10 phút.',
          'booking_update',
          false,
          v_booking.id
        ),
        (
          v_booking.driver_id,
          'Đến giờ chuẩn bị đón khách',
          'Chuyến đặt trước sẽ bắt đầu sau khoảng 10 phút. Hãy mở lộ trình và di chuyển tới điểm đón.',
          'booking_update',
          false,
          v_booking.id
        );

      update public.bookings
      set reminder_10_sent_at = now(),
          status = case when status = 'SCHEDULED_DRIVER_ACCEPTED' then 'SCHEDULED_UPCOMING' else status end,
          scheduled_status = 'upcoming',
          updated_at = now()
      where id = v_booking.id;
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daigo_scheduled_booking_reminders') then
    perform cron.unschedule('daigo_scheduled_booking_reminders');
  end if;
  perform cron.schedule(
    'daigo_scheduled_booking_reminders',
    '* * * * *',
    'select app_private.send_scheduled_booking_reminders();'
  );
exception
  when undefined_table or undefined_function then
    null;
end $$;
