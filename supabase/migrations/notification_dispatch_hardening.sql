alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'booking_success',
      'driver_confirm',
      'driver_cancel',
      'trip_done',
      'booking_update',
      'payment_update',
      'blog_interaction',
      'incoming_call',
      'system'
    )
  );

drop policy if exists "Booking recipients create booking notifications" on public.notifications;
create policy "Booking participants create booking notifications"
on public.notifications
for insert
to authenticated
with check (
  related_booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = notifications.related_booking_id
      and (notifications.user_id = b.customer_id or notifications.user_id = b.driver_id)
      and ((select auth.uid()) = b.customer_id or (select auth.uid()) = b.driver_id)
  )
);

drop policy if exists "Customers notify recipients for own booking" on public.notifications;
drop policy if exists "Customers notify drivers for own booking" on public.notifications;
drop policy if exists "Drivers receive pending booking notifications" on public.notifications;

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

  select *
  into v_booking
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
      coalesce(v_booking.pickup_location, 'Điểm đón chưa rõ'),
      ' → ',
      coalesce(v_booking.dropoff_location, 'Điểm đến chưa rõ'),
      '. ',
      coalesce(v_booking.passengers, 1),
      ' khách',
      case
        when v_booking.booking_mode = 'scheduled' and v_booking.booking_time is not null
          then concat(', lúc ', v_booking.booking_time)
        else ''
      end,
      case
        when nullif(trim(coalesce(v_booking.note, '')), '') is not null
          then concat('. Ghi chú: ', v_booking.note)
        else ''
      end
    ),
    'booking_update',
    false,
    p_booking_id
  from public.profiles p
  where p.role = 'driver'
    and p.id <> v_booking.customer_id
    and (
      v_booking.booking_mode <> 'scheduled'
      or (
        v_booking.scheduled_start_at is not null
        and v_booking.scheduled_end_at is not null
        and not exists (
          select 1
          from public.driver_schedules s
          where s.driver_id = p.id
            and s.status in ('reserved', 'accepted')
            and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(v_booking.scheduled_start_at, v_booking.scheduled_end_at, '[)')
        )
      )
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = p.id
        and n.related_booking_id = p_booking_id
        and n.type = 'booking_update'
        and n.title in ('Có chuyến đặt trước mới', 'Có yêu cầu đặt xe mới')
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.notify_available_drivers_for_booking(uuid) from public, anon;
grant execute on function public.notify_available_drivers_for_booking(uuid) to authenticated;
