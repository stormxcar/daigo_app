create schema if not exists app_private;

create table if not exists public.booking_dispatches (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'timeout', 'skipped')),
  attempt integer not null default 1 check (attempt > 0),
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists booking_dispatches_booking_id_idx on public.booking_dispatches(booking_id);
create index if not exists booking_dispatches_driver_id_idx on public.booking_dispatches(driver_id);
create index if not exists booking_dispatches_status_expires_idx on public.booking_dispatches(status, expires_at);

create unique index if not exists booking_dispatches_one_pending_per_booking
  on public.booking_dispatches(booking_id)
  where status = 'pending';

create unique index if not exists booking_dispatches_one_driver_attempt_per_booking
  on public.booking_dispatches(booking_id, driver_id);

alter table public.booking_dispatches enable row level security;

revoke all on public.booking_dispatches from anon;
revoke all on public.booking_dispatches from authenticated;
grant select, update on public.booking_dispatches to authenticated;

drop policy if exists "Drivers read own dispatches" on public.booking_dispatches;
create policy "Drivers read own dispatches"
on public.booking_dispatches
for select
to authenticated
using (driver_id = (select auth.uid()));

drop policy if exists "Customers read dispatches for own bookings" on public.booking_dispatches;
create policy "Customers read dispatches for own bookings"
on public.booking_dispatches
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_dispatches.booking_id
      and b.customer_id = (select auth.uid())
  )
);

drop policy if exists "Drivers reject own pending dispatches" on public.booking_dispatches;
create policy "Drivers reject own pending dispatches"
on public.booking_dispatches
for update
to authenticated
using (
  driver_id = (select auth.uid())
  and status = 'pending'
)
with check (
  driver_id = (select auth.uid())
  and status in ('rejected', 'timeout')
);

drop policy if exists "Drivers accept own dispatch for assigned booking" on public.booking_dispatches;
create policy "Drivers accept own dispatch for assigned booking"
on public.booking_dispatches
for update
to authenticated
using (
  driver_id = (select auth.uid())
  and status = 'pending'
)
with check (
  driver_id = (select auth.uid())
  and status = 'accepted'
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_dispatches.booking_id
      and b.driver_id = (select auth.uid())
  )
);

create or replace function app_private.enqueue_next_booking_dispatch(p_booking_id uuid)
returns public.booking_dispatches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings;
  v_driver_id uuid;
  v_attempt integer;
  v_dispatch public.booking_dispatches;
begin
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    return null;
  end if;

  if v_booking.driver_id is not null
     or v_booking.status <> 'SEARCHING_DRIVER' then
    return null;
  end if;

  if exists (
    select 1
    from public.booking_dispatches d
    where d.booking_id = p_booking_id
      and d.status = 'pending'
      and d.expires_at > now()
  ) then
    return null;
  end if;

  update public.booking_dispatches d
  set status = 'timeout',
      responded_at = now()
  where d.booking_id = p_booking_id
    and d.status = 'pending'
    and d.expires_at <= now();

  select p.id
  into v_driver_id
  from public.profiles p
  join public.drivers dr on dr.profile_id = p.id
  where p.role = 'driver'
    and dr.is_online = true
    and dr.verification_status = 'APPROVED'
    and exists (
      select 1
      from public.vehicles v
      where v.driver_id = p.id
        and coalesce(v.is_active, true) = true
        and v.status = 'Sẵn sàng'
    )
    and not exists (
      select 1
      from public.bookings active
      where active.driver_id = p.id
        and active.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
    )
    and not exists (
      select 1
      from public.booking_dispatches prior
      where prior.booking_id = p_booking_id
        and prior.driver_id = p.id
    )
  order by
    case
      when v_booking.pickup_lat is not null
       and v_booking.pickup_lng is not null
       and dr.current_latitude is not null
       and dr.current_longitude is not null
      then
        power(dr.current_latitude - v_booking.pickup_lat, 2)
        + power(dr.current_longitude - v_booking.pickup_lng, 2)
      else null
    end asc nulls last,
    dr.updated_location_at desc nulls last,
    p.created_at asc
  limit 1;

  if v_driver_id is null then
    return null;
  end if;

  select count(*) + 1
  into v_attempt
  from public.booking_dispatches
  where booking_id = p_booking_id;

  insert into public.booking_dispatches (
    booking_id,
    driver_id,
    status,
    attempt,
    expires_at
  )
  values (
    p_booking_id,
    v_driver_id,
    'pending',
    v_attempt,
    now() + interval '60 seconds'
  )
  returning * into v_dispatch;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (
    v_driver_id,
    'Có chuyến mới cần phản hồi',
    'Bạn có 60 giây để nhận hoặc từ chối chuyến đi mới.',
    'booking_update',
    false,
    p_booking_id
  );

  return v_dispatch;
end;
$$;

revoke all on function app_private.enqueue_next_booking_dispatch(uuid) from anon, authenticated;

create or replace function app_private.dispatch_booking_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'SEARCHING_DRIVER' and new.driver_id is null then
    perform app_private.enqueue_next_booking_dispatch(new.id);
  end if;
  return new;
end;
$$;

revoke all on function app_private.dispatch_booking_after_insert() from anon, authenticated;

drop trigger if exists dispatch_booking_after_insert on public.bookings;
create trigger dispatch_booking_after_insert
after insert on public.bookings
for each row execute function app_private.dispatch_booking_after_insert();

create or replace function app_private.dispatch_next_after_response()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('rejected', 'timeout') then
    perform app_private.enqueue_next_booking_dispatch(new.booking_id);
  end if;

  return new;
end;
$$;

revoke all on function app_private.dispatch_next_after_response() from anon, authenticated;

drop trigger if exists dispatch_next_after_response on public.booking_dispatches;
create trigger dispatch_next_after_response
after update of status on public.booking_dispatches
for each row execute function app_private.dispatch_next_after_response();

create or replace function public.reject_booking_dispatch(p_dispatch_id uuid)
returns public.booking_dispatches
language plpgsql
set search_path = public
as $$
declare
  v_driver_id uuid := auth.uid();
  v_dispatch public.booking_dispatches;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để từ chối chuyến.' using errcode = '28000';
  end if;

  update public.booking_dispatches d
  set status = 'rejected',
      responded_at = now()
  where d.id = p_dispatch_id
    and d.driver_id = v_driver_id
    and d.status = 'pending'
  returning * into v_dispatch;

  if not found then
    raise exception 'Yêu cầu chuyến không còn khả dụng.' using errcode = '23505';
  end if;

  return v_dispatch;
end;
$$;

grant execute on function public.reject_booking_dispatch(uuid) to authenticated;

create or replace function public.timeout_booking_dispatch(p_dispatch_id uuid)
returns public.booking_dispatches
language plpgsql
set search_path = public
as $$
declare
  v_driver_id uuid := auth.uid();
  v_dispatch public.booking_dispatches;
begin
  if v_driver_id is null then
    raise exception 'Bạn cần đăng nhập để cập nhật chuyến.' using errcode = '28000';
  end if;

  update public.booking_dispatches d
  set status = 'timeout',
      responded_at = now()
  where d.id = p_dispatch_id
    and d.driver_id = v_driver_id
    and d.status = 'pending'
  returning * into v_dispatch;

  if not found then
    raise exception 'Yêu cầu chuyến không còn khả dụng.' using errcode = '23505';
  end if;

  return v_dispatch;
end;
$$;

grant execute on function public.timeout_booking_dispatch(uuid) to authenticated;

create or replace function public.accept_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
set search_path = public
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

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values (
    v_booking.customer_id,
    'Tài xế đã nhận chuyến',
    'Tài xế đã nhận chuyến của bạn.',
    'driver_confirm',
    false,
    v_booking.id
  );

  return v_booking;
end;
$$;

grant execute on function public.accept_booking(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.booking_dispatches;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
