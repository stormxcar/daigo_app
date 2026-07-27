create extension if not exists pgcrypto with schema extensions;

alter table public.bookings
  add column if not exists booking_source text not null default 'normal',
  add column if not exists gonow_session_id uuid null;

alter table public.bookings
  drop constraint if exists bookings_booking_source_check;

alter table public.bookings
  add constraint bookings_booking_source_check
  check (booking_source in ('normal', 'scheduled', 'gonow'));

create table if not exists public.gonow_sessions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid null references public.vehicles(id) on delete set null,
  pin_hash text not null,
  pin_last4 text null,
  status text not null default 'active',
  expires_at timestamptz not null,
  matched_customer_id uuid null references public.profiles(id) on delete set null,
  matched_booking_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gonow_sessions_status_check check (status in ('active', 'matched', 'expired', 'cancelled'))
);

alter table public.gonow_sessions
  add constraint gonow_sessions_matched_booking_id_fkey
  foreign key (matched_booking_id) references public.bookings(id) on delete set null;

alter table public.bookings
  add constraint bookings_gonow_session_id_fkey
  foreign key (gonow_session_id) references public.gonow_sessions(id) on delete set null;

create index if not exists gonow_sessions_driver_active_idx
  on public.gonow_sessions(driver_id, status, expires_at desc);

create unique index if not exists gonow_sessions_active_pin_hash_unique
  on public.gonow_sessions(pin_hash)
  where status = 'active';

alter table public.gonow_sessions enable row level security;

drop policy if exists "Drivers can read own Gonow sessions" on public.gonow_sessions;
create policy "Drivers can read own Gonow sessions"
  on public.gonow_sessions for select
  to authenticated
  using (driver_id = auth.uid());

drop policy if exists "Customers can read matched own Gonow sessions" on public.gonow_sessions;
create policy "Customers can read matched own Gonow sessions"
  on public.gonow_sessions for select
  to authenticated
  using (matched_customer_id = auth.uid());

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
      'missed_call',
      'chat_message',
      'booking_created',
      'booking_accepted',
      'booking_cancelled',
      'scheduled_reminder',
      'payment_submitted',
      'payment_verified',
      'blog_liked',
      'blog_commented',
      'rating_received',
      'gonow_booking_created',
      'system'
    )
  );

create or replace function public.create_gonow_session(p_vehicle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
  v_vehicle_id uuid;
  v_pin text;
  v_pin_hash text;
  v_session public.gonow_sessions;
  v_driver_ok boolean;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để tạo mã Gonow.' using errcode = '28000';
  end if;

  update public.gonow_sessions
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at <= now();

  select exists (
    select 1
    from public.profiles p
    join public.drivers d on d.profile_id = p.id
    where p.id = v_driver_id
      and p.role = 'driver'
      and d.verification_status in ('APPROVED', 'PENDING')
      and d.is_online = true
      and d.offline_reason is distinct from 'pause'
      and (d.pause_until is null or d.pause_until <= now())
  ) into v_driver_ok;

  if not v_driver_ok then
    raise exception 'Tài xế chưa đủ điều kiện tạo mã Gonow.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.driver_id = v_driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Bạn đang có một chuyến đang hoạt động nên chưa thể tạo Gonow.' using errcode = '23514';
  end if;

  select v.id
  into v_vehicle_id
  from public.vehicles v
  where v.driver_id = v_driver_id
    and (p_vehicle_id is null or v.id = p_vehicle_id)
    and coalesce(v.is_active, true) = true
    and v.status = 'Sẵn sàng'
  order by v.updated_at desc nulls last, v.created_at desc
  limit 1;

  if v_vehicle_id is null then
    raise exception 'Bạn cần có xe đang sẵn sàng để tạo mã Gonow.' using errcode = '23514';
  end if;

  update public.gonow_sessions
  set status = 'cancelled', updated_at = now()
  where driver_id = v_driver_id and status = 'active';

  for i in 1..5 loop
    v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
    v_pin_hash := encode(extensions.digest(v_pin, 'sha256'), 'hex');
    begin
      insert into public.gonow_sessions (
        driver_id,
        vehicle_id,
        pin_hash,
        pin_last4,
        expires_at
      )
      values (
        v_driver_id,
        v_vehicle_id,
        v_pin_hash,
        right(v_pin, 4),
        now() + interval '2 minutes'
      )
      returning * into v_session;
      exit;
    exception when unique_violation then
      v_session := null;
    end;
  end loop;

  if v_session.id is null then
    raise exception 'Không thể tạo mã Gonow lúc này. Vui lòng thử lại.' using errcode = '23505';
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'pin', v_pin,
    'expires_at', v_session.expires_at,
    'vehicle_id', v_session.vehicle_id
  );
end;
$$;

create or replace function public.cancel_gonow_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_driver_id uuid := auth.uid();
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để hủy mã Gonow.' using errcode = '28000';
  end if;

  update public.gonow_sessions
  set status = 'cancelled', updated_at = now()
  where id = p_session_id
    and driver_id = v_driver_id
    and status = 'active';

  return found;
end;
$$;

create or replace function public.verify_gonow_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  v_pin_hash text;
  v_session public.gonow_sessions;
  v_driver public.profiles;
  v_vehicle public.vehicles;
begin
  if v_customer_id is null then
    raise exception 'Bạn cần đăng nhập để dùng Gonow.' using errcode = '28000';
  end if;

  if length(v_pin) <> 6 then
    raise exception 'Mã Gonow phải gồm 6 số.' using errcode = '22023';
  end if;

  update public.gonow_sessions
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at <= now();

  v_pin_hash := encode(extensions.digest(v_pin, 'sha256'), 'hex');

  select *
  into v_session
  from public.gonow_sessions
  where pin_hash = v_pin_hash
    and status = 'active'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Mã Gonow không hợp lệ hoặc đã hết hạn.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.driver_id = v_session.driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Tài xế đang bận chuyến khác. Vui lòng xin mã mới sau.' using errcode = '23514';
  end if;

  select * into v_driver from public.profiles where id = v_session.driver_id;
  select * into v_vehicle from public.vehicles where id = v_session.vehicle_id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'expires_at', v_session.expires_at,
    'driver', jsonb_build_object(
      'id', v_driver.id,
      'full_name', v_driver.full_name,
      'phone', v_driver.phone,
      'avatar_url', v_driver.avatar_url
    ),
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'name', v_vehicle.name,
      'brand', v_vehicle.brand,
      'license_plate', v_vehicle.license_plate,
      'color', v_vehicle.color,
      'seats', v_vehicle.seats,
      'price_per_km', v_vehicle.price_per_km,
      'image', v_vehicle.image,
      'image_urls', v_vehicle.image_urls
    )
  );
end;
$$;

create or replace function public.create_gonow_booking(
  p_session_id uuid,
  p_pickup_location text,
  p_dropoff_location text,
  p_pickup_lat numeric default null,
  p_pickup_lng numeric default null,
  p_dropoff_lat numeric default null,
  p_dropoff_lng numeric default null,
  p_booking_date date default current_date,
  p_booking_time time default localtime,
  p_passengers integer default 1,
  p_note text default null,
  p_distance numeric default null,
  p_estimated_price integer default 0,
  p_idempotency_key text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_session public.gonow_sessions;
  v_booking public.bookings;
  v_customer public.profiles;
begin
  if v_customer_id is null then
    raise exception 'Bạn cần đăng nhập để tạo chuyến Gonow.' using errcode = '28000';
  end if;

  select *
  into v_session
  from public.gonow_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Không tìm thấy phiên Gonow.' using errcode = 'P0002';
  end if;

  if v_session.status <> 'active' or v_session.expires_at <= now() then
    update public.gonow_sessions
    set status = case when status = 'active' then 'expired' else status end,
        updated_at = now()
    where id = v_session.id;
    raise exception 'Mã Gonow đã hết hạn hoặc đã được sử dụng.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.customer_id = v_customer_id
      and b.status in ('SEARCHING_DRIVER', 'SCHEDULED_PENDING_DRIVER', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Bạn đang có một chuyến xe đang hoạt động.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.driver_id = v_session.driver_id
      and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
  ) then
    raise exception 'Tài xế đang bận chuyến khác.' using errcode = '23514';
  end if;

  select * into v_customer from public.profiles where id = v_customer_id;

  if p_idempotency_key is not null then
    select *
    into v_booking
    from public.bookings
    where customer_id = v_customer_id
      and idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return v_booking;
    end if;
  end if;

  insert into public.bookings (
    customer_id,
    vehicle_id,
    driver_id,
    status,
    booking_mode,
    booking_source,
    gonow_session_id,
    vehicle_type,
    pickup_location,
    pickup_lat,
    pickup_lng,
    dropoff_location,
    dropoff_lat,
    dropoff_lng,
    booking_date,
    booking_time,
    passengers,
    note,
    estimated_price,
    distance,
    idempotency_key,
    locked,
    accepted_at
  )
  values (
    v_customer_id,
    v_session.vehicle_id,
    v_session.driver_id,
    'DRIVER_ACCEPTED',
    'instant',
    'gonow',
    v_session.id,
    (select name from public.vehicles where id = v_session.vehicle_id),
    nullif(trim(p_pickup_location), ''),
    p_pickup_lat,
    p_pickup_lng,
    nullif(trim(p_dropoff_location), ''),
    p_dropoff_lat,
    p_dropoff_lng,
    coalesce(p_booking_date, current_date),
    coalesce(p_booking_time, localtime),
    greatest(coalesce(p_passengers, 1), 1),
    nullif(trim(coalesce(p_note, '')), ''),
    greatest(coalesce(p_estimated_price, 0), 0),
    p_distance,
    p_idempotency_key,
    true,
    now()
  )
  returning * into v_booking;

  update public.gonow_sessions
  set status = 'matched',
      matched_customer_id = v_customer_id,
      matched_booking_id = v_booking.id,
      updated_at = now()
  where id = v_session.id;

  insert into public.conversations (booking_id, customer_id, driver_id)
  values (v_booking.id, v_customer_id, v_session.driver_id)
  on conflict (booking_id) do update
  set customer_id = excluded.customer_id,
      driver_id = excluded.driver_id,
      updated_at = now();

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values
    (
      v_session.driver_id,
      'Khách đã kết nối Gonow',
      concat(coalesce(v_customer.full_name, 'Khách hàng'), ' đã tạo chuyến Gonow: ', p_pickup_location, ' → ', p_dropoff_location),
      'gonow_booking_created',
      false,
      v_booking.id
    ),
    (
      v_customer_id,
      'Đã kết nối Gonow',
      concat('Bạn đã kết nối với tài xế Daigo cho tuyến ', p_pickup_location, ' → ', p_dropoff_location),
      'booking_accepted',
      false,
      v_booking.id
    );

  return v_booking;
end;
$$;

revoke all on function public.create_gonow_session(uuid) from public, anon;
revoke all on function public.cancel_gonow_session(uuid) from public, anon;
revoke all on function public.verify_gonow_pin(text) from public, anon;
revoke all on function public.create_gonow_booking(uuid, text, text, numeric, numeric, numeric, numeric, date, time, integer, text, numeric, integer, text) from public, anon;

grant execute on function public.create_gonow_session(uuid) to authenticated;
grant execute on function public.cancel_gonow_session(uuid) to authenticated;
grant execute on function public.verify_gonow_pin(text) to authenticated;
grant execute on function public.create_gonow_booking(uuid, text, text, numeric, numeric, numeric, numeric, date, time, integer, text, numeric, integer, text) to authenticated;



