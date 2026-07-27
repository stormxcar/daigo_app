create extension if not exists pgcrypto with schema extensions;

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

grant execute on function public.create_gonow_session(uuid) to authenticated;
grant execute on function public.verify_gonow_pin(text) to authenticated;
