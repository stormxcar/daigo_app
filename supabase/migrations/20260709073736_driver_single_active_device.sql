create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  platform text,
  push_token text,
  is_active boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_devices_platform_check check (platform is null or platform in ('ios', 'android', 'web', 'unknown')),
  constraint user_devices_device_id_not_blank check (length(trim(device_id)) > 0),
  constraint user_devices_user_device_unique unique (user_id, device_id)
);

create unique index if not exists user_devices_one_active_per_user_idx
on public.user_devices (user_id)
where is_active = true;

create index if not exists user_devices_user_seen_idx
on public.user_devices (user_id, last_seen_at desc);

alter table public.user_devices enable row level security;

grant select, insert, update, delete on public.user_devices to authenticated;
revoke all on public.user_devices from anon;

drop policy if exists "Users manage own devices" on public.user_devices;
create policy "Users manage own devices"
on public.user_devices
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_user_devices_updated_at on public.user_devices;
create trigger set_user_devices_updated_at
before update on public.user_devices
for each row execute function app_private.touch_updated_at();

create or replace function public.activate_driver_device(
  p_device_id text,
  p_platform text default null,
  p_push_token text default null,
  p_force boolean default true
)
returns public.user_devices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_device public.user_devices;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để kích hoạt thiết bị.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_device_id, '')), '') is null then
    raise exception 'Thiếu mã thiết bị.' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or v_profile.role <> 'driver' then
    raise exception 'Chỉ tài khoản tài xế mới cần thiết bị vận hành.' using errcode = '42501';
  end if;

  if not p_force and exists (
    select 1 from public.user_devices
    where user_id = v_user_id and is_active = true and device_id <> p_device_id
  ) then
    raise exception 'Tài khoản tài xế đang hoạt động trên thiết bị khác.' using errcode = '23505';
  end if;

  update public.user_devices
  set is_active = false
  where user_id = v_user_id
    and device_id <> p_device_id
    and is_active = true;

  insert into public.user_devices (user_id, device_id, platform, push_token, is_active, last_seen_at)
  values (
    v_user_id,
    trim(p_device_id),
    case when p_platform in ('ios', 'android', 'web') then p_platform else 'unknown' end,
    p_push_token,
    true,
    now()
  )
  on conflict (user_id, device_id) do update
  set platform = excluded.platform,
      push_token = coalesce(excluded.push_token, public.user_devices.push_token),
      is_active = true,
      last_seen_at = now(),
      updated_at = now()
  returning * into v_device;

  return v_device;
end;
$$;

create or replace function public.touch_user_device(
  p_device_id text,
  p_platform text default null,
  p_push_token text default null
)
returns public.user_devices
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_device public.user_devices;
begin
  if v_user_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật thiết bị.' using errcode = '42501';
  end if;

  insert into public.user_devices (user_id, device_id, platform, push_token, is_active, last_seen_at)
  values (
    v_user_id,
    trim(p_device_id),
    case when p_platform in ('ios', 'android', 'web') then p_platform else 'unknown' end,
    p_push_token,
    false,
    now()
  )
  on conflict (user_id, device_id) do update
  set platform = excluded.platform,
      push_token = coalesce(excluded.push_token, public.user_devices.push_token),
      last_seen_at = now(),
      updated_at = now()
  returning * into v_device;

  return v_device;
end;
$$;

create or replace function app_private.require_active_driver_device(p_driver_id uuid, p_device_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(coalesce(p_device_id, '')), '') is null then
    raise exception 'Thiết bị này chưa được kích hoạt cho tài xế. Vui lòng vào lại tài khoản tài xế.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_devices d
    where d.user_id = p_driver_id
      and d.device_id = trim(p_device_id)
      and d.is_active = true
  ) then
    raise exception 'Tài khoản tài xế đang hoạt động trên thiết bị khác. Vui lòng chuyển quyền vận hành sang thiết bị này.' using errcode = '42501';
  end if;

  update public.user_devices
  set last_seen_at = now(), updated_at = now()
  where user_id = p_driver_id and device_id = trim(p_device_id);
end;
$$;

create or replace function public.set_driver_online_from_device(
  p_device_id text,
  p_is_online boolean,
  p_lat double precision default null,
  p_lng double precision default null,
  p_pause_until timestamptz default null
)
returns public.drivers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_existing public.drivers;
  v_driver public.drivers;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật trạng thái tài xế.' using errcode = '42501';
  end if;

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

  select * into v_existing from public.drivers where profile_id = v_driver_id;

  if not found then
    insert into public.drivers (
      profile_id,
      is_online,
      verification_status,
      current_latitude,
      current_longitude,
      updated_location_at,
      pause_until,
      offline_reason
    ) values (
      v_driver_id,
      p_is_online,
      'PENDING',
      p_lat,
      p_lng,
      case when p_lat is not null and p_lng is not null then now() else null end,
      p_pause_until,
      case when p_is_online then null when p_pause_until is not null then 'pause' else 'manual' end
    ) returning * into v_driver;
    return v_driver;
  end if;

  if p_is_online and v_existing.verification_status <> 'APPROVED' then
    raise exception 'Bạn chưa được duyệt tài khoản tài xế.' using errcode = '42501';
  end if;

  update public.drivers
  set is_online = p_is_online,
      current_latitude = coalesce(p_lat, current_latitude),
      current_longitude = coalesce(p_lng, current_longitude),
      updated_location_at = case when p_lat is not null and p_lng is not null then now() else updated_location_at end,
      pause_until = case when p_is_online then null else coalesce(p_pause_until, pause_until) end,
      offline_reason = case when p_is_online then null when p_pause_until is not null then 'pause' else 'manual' end
  where profile_id = v_driver_id
  returning * into v_driver;

  return v_driver;
end;
$$;

create or replace function public.accept_booking(p_booking_id uuid, p_device_id text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
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

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

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

  select * into v_dispatch
  from public.booking_dispatches d
  where d.booking_id = p_booking_id
    and d.driver_id = v_driver_id
    and d.status = 'pending'
    and d.expires_at > now()
  order by d.created_at asc
  limit 1
  for update;

  if not found and exists (
    select 1 from public.booking_dispatches d
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
    set status = 'accepted', responded_at = now()
    where id = v_dispatch.id;
  end if;

  update public.conversations
  set driver_id = v_driver_id, updated_at = now()
  where booking_id = p_booking_id;

  return v_booking;
end;
$$;

create or replace function public.accept_scheduled_booking(p_booking_id uuid, p_device_id text default null)
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

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

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
    select 1 from public.bookings b
    where b.driver_id = v_driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Bạn đang có một chuyến đang hoạt động.' using errcode = '23514';
  end if;

  select * into v_booking
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

  if v_booking.scheduled_response_deadline_at is not null and now() > v_booking.scheduled_response_deadline_at then
    raise exception 'Đã hết thời gian nhận chuyến đặt trước này.' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.driver_schedules s
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
  set start_at = excluded.start_at, end_at = excluded.end_at, status = 'accepted', updated_at = now();

  update public.conversations
  set driver_id = v_driver_id, updated_at = now()
  where booking_id = p_booking_id;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (v_booking.customer_id, 'Tài xế đã nhận chuyến đặt trước', 'Tài xế đã xác nhận chuyến đặt trước của bạn.', 'driver_confirm', false, p_booking_id);

  return v_booking;
end;
$$;

create or replace function public.reject_scheduled_booking(p_booking_id uuid, p_device_id text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để từ chối chuyến.' using errcode = '42501';
  end if;

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

  select * into v_booking
  from public.bookings
  where id = p_booking_id;

  if not found then
    raise exception 'Không tìm thấy chuyến đặt trước.' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (
    v_booking.customer_id,
    'Tài xế chưa thể nhận chuyến đặt trước',
    'Một tài xế đã từ chối chuyến đặt trước. Hệ thống vẫn tiếp tục hiển thị chuyến cho tài xế phù hợp khác.',
    'booking_update',
    false,
    p_booking_id
  );

  return v_booking;
end;
$$;

create or replace function public.driver_transition_booking(
  p_booking_id uuid,
  p_action text,
  p_reason text default null,
  p_device_id text default null
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

  perform app_private.require_active_driver_device(v_driver_id, p_device_id);

  select * into v_booking
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
    if v_booking.status = v_target_status then return v_booking; end if;
    if v_booking.status not in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING') then
      raise exception 'Không thể chuyển sang trạng thái đang tới từ trạng thái hiện tại.' using errcode = '23514';
    end if;
    update public.bookings set status = v_target_status, arriving_at = coalesce(arriving_at, now()), updated_at = now()
    where id = p_booking_id returning * into v_booking;
    v_notification_title := 'Tài xế đang tới';
    v_notification_content := 'Tài xế đang di chuyển đến điểm đón.';
  elsif p_action = 'mark_arrived' then
    v_target_status := 'DRIVER_ARRIVED';
    if v_booking.status = v_target_status then return v_booking; end if;
    if v_booking.status <> 'DRIVER_ARRIVING' then
      raise exception 'Không thể xác nhận đã tới nơi từ trạng thái hiện tại.' using errcode = '23514';
    end if;
    update public.bookings set status = v_target_status, arrived_at = coalesce(arrived_at, now()), updated_at = now()
    where id = p_booking_id returning * into v_booking;
    v_notification_title := 'Tài xế đã đến điểm đón';
    v_notification_content := 'Tài xế đã đến điểm đón. Vui lòng ra xe.';
  elsif p_action = 'start_trip' then
    v_target_status := 'TRIP_STARTED';
    if v_booking.status = v_target_status then return v_booking; end if;
    if v_booking.status <> 'DRIVER_ARRIVED' then
      raise exception 'Không thể bắt đầu chuyến từ trạng thái hiện tại.' using errcode = '23514';
    end if;
    update public.bookings set status = v_target_status, started_at = coalesce(started_at, now()), updated_at = now()
    where id = p_booking_id returning * into v_booking;
    v_notification_title := 'Chuyến đi đã bắt đầu';
    v_notification_content := 'Chuyến đi của bạn đã bắt đầu.';
  elsif p_action = 'complete_trip' then
    v_target_status := 'TRIP_COMPLETED';
    if v_booking.status = v_target_status then return v_booking; end if;
    if v_booking.status <> 'TRIP_STARTED' then
      raise exception 'Không thể hoàn thành chuyến từ trạng thái hiện tại.' using errcode = '23514';
    end if;
    update public.bookings set status = v_target_status, completed_at = coalesce(completed_at, now()), updated_at = now()
    where id = p_booking_id returning * into v_booking;
    insert into public.trip_history (booking_id, customer_id, driver_id, pickup_address, dropoff_address, started_at, completed_at)
    select v_booking.id, v_booking.customer_id, v_booking.driver_id, v_booking.pickup_location, v_booking.dropoff_location, v_booking.started_at, coalesce(v_booking.completed_at, now())
    where not exists (select 1 from public.trip_history h where h.booking_id = v_booking.id);
    v_notification_title := 'Chuyến đi đã hoàn thành';
    v_notification_content := 'Chuyến đi đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ.';
  elsif p_action = 'cancel_by_driver' then
    v_target_status := 'DRIVER_CANCELLED';
    if v_booking.status = v_target_status then return v_booking; end if;
    if v_booking.status not in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED') then
      raise exception 'Không thể hủy chuyến ở trạng thái hiện tại.' using errcode = '23514';
    end if;
    if v_booking.booking_mode = 'scheduled' and v_booking.scheduled_start_at is not null and now() >= v_booking.scheduled_start_at then
      raise exception 'Chuyến đặt trước đã đến giờ thao tác. Vui lòng cập nhật trạng thái chuyến thay vì hủy.' using errcode = '23514';
    end if;
    update public.bookings
    set status = v_target_status, cancelled_by = 'DRIVER', cancel_reason = nullif(trim(coalesce(p_reason, '')), ''), cancelled_at = coalesce(cancelled_at, now()), updated_at = now()
    where id = p_booking_id returning * into v_booking;
    v_notification_title := 'Tài xế đã hủy chuyến';
    v_notification_content := coalesce('Tài xế đã hủy chuyến. Lý do: ' || nullif(trim(coalesce(p_reason, '')), ''), 'Tài xế đã hủy chuyến. Bạn có thể đặt lại chuyến mới.');
  else
    raise exception 'Hành động chuyến đi không hợp lệ.' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (
    v_booking.customer_id,
    v_notification_title,
    v_notification_content,
    case when p_action = 'complete_trip' then 'trip_done' when p_action = 'cancel_by_driver' then 'driver_cancel' else 'booking_update' end,
    false,
    v_booking.id
  );

  return v_booking;
end;
$$;

revoke all on function public.activate_driver_device(text, text, text, boolean) from public, anon;
grant execute on function public.activate_driver_device(text, text, text, boolean) to authenticated;
revoke all on function public.touch_user_device(text, text, text) from public, anon;
grant execute on function public.touch_user_device(text, text, text) to authenticated;
revoke all on function public.set_driver_online_from_device(text, boolean, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.set_driver_online_from_device(text, boolean, double precision, double precision, timestamptz) to authenticated;

revoke all on function public.accept_booking(uuid) from authenticated;
revoke all on function public.accept_scheduled_booking(uuid) from authenticated;
revoke all on function public.reject_scheduled_booking(uuid) from authenticated;
revoke all on function public.driver_transition_booking(uuid, text, text) from authenticated;

grant execute on function public.accept_booking(uuid, text) to authenticated;
grant execute on function public.accept_scheduled_booking(uuid, text) to authenticated;
grant execute on function public.reject_scheduled_booking(uuid, text) to authenticated;
grant execute on function public.driver_transition_booking(uuid, text, text, text) to authenticated;
