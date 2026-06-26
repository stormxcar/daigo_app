-- Scheduled booking support: booking windows, driver calendar, and race-safe accept RPC.

alter table public.bookings
  add column if not exists booking_mode text not null default 'instant',
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists scheduled_status text,
  add column if not exists estimated_duration_minutes integer not null default 90,
  add column if not exists buffer_before_minutes integer not null default 15,
  add column if not exists buffer_after_minutes integer not null default 15,
  add column if not exists scheduled_response_deadline_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_booking_mode_check,
  add constraint bookings_booking_mode_check
  check (booking_mode in ('instant', 'scheduled'));

alter table public.bookings
  drop constraint if exists bookings_scheduled_status_check,
  add constraint bookings_scheduled_status_check
  check (
    scheduled_status is null
    or scheduled_status in ('pending_driver', 'driver_accepted', 'driver_rejected', 'cancelled', 'upcoming')
  );

alter table public.bookings
  drop constraint if exists bookings_schedule_window_check,
  add constraint bookings_schedule_window_check
  check (
    booking_mode = 'instant'
    or (
      scheduled_start_at is not null
      and scheduled_end_at is not null
      and scheduled_end_at > scheduled_start_at
    )
  );

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'CREATED',
      'SEARCHING_DRIVER',
      'SCHEDULED_PENDING_DRIVER',
      'SCHEDULED_DRIVER_ACCEPTED',
      'SCHEDULED_DRIVER_REJECTED',
      'SCHEDULED_CANCELLED',
      'SCHEDULED_UPCOMING',
      'DRIVER_ACCEPTED',
      'DRIVER_ARRIVING',
      'DRIVER_ARRIVED',
      'TRIP_STARTED',
      'TRIP_COMPLETED',
      'CUSTOMER_CANCELLED',
      'DRIVER_CANCELLED',
      'EXPIRED'
    )
  );

create extension if not exists btree_gist with schema extensions;

create table if not exists public.driver_schedules (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_schedules_window_check check (end_at > start_at),
  constraint driver_schedules_status_check check (status in ('reserved', 'accepted', 'cancelled', 'completed')),
  constraint driver_schedules_booking_driver_unique unique (booking_id, driver_id)
);

alter table public.driver_schedules enable row level security;

drop policy if exists "Drivers read own schedules" on public.driver_schedules;
create policy "Drivers read own schedules"
on public.driver_schedules
for select
to authenticated
using (
  driver_id = (select auth.uid())
  or exists (
    select 1
    from public.bookings b
    where b.id = driver_schedules.booking_id
      and b.customer_id = (select auth.uid())
  )
);

drop policy if exists "Drivers update own schedules" on public.driver_schedules;
create policy "Drivers update own schedules"
on public.driver_schedules
for update
to authenticated
using (driver_id = (select auth.uid()))
with check (driver_id = (select auth.uid()));

create index if not exists driver_schedules_driver_start_idx
on public.driver_schedules (driver_id, start_at);

do $$
begin
  alter table public.driver_schedules
    add constraint driver_schedules_no_overlap
    exclude using gist (
      driver_id with =,
      tstzrange(start_at, end_at, '[)') with &&
    )
    where (status in ('reserved', 'accepted'));
exception
  when duplicate_object then null;
end $$;

create or replace function public.find_available_drivers(
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_pickup_lat double precision default null,
  p_pickup_lng double precision default null
)
returns table (
  driver_id uuid,
  vehicle_id uuid
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select distinct on (p.id)
    p.id as driver_id,
    v.id as vehicle_id
  from public.profiles p
  join public.drivers d on d.profile_id = p.id
  join public.vehicles v on v.driver_id = p.id
  where p.role = 'driver'
    and coalesce(v.is_active, true) = true
    and v.status = 'Sẵn sàng'
    and d.verification_status in ('APPROVED', 'PENDING')
    and not exists (
      select 1
      from public.driver_schedules s
      where s.driver_id = p.id
        and s.status in ('reserved', 'accepted')
        and tstzrange(s.start_at, s.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
    )
    and not exists (
      select 1
      from public.bookings b
      where b.driver_id = p.id
        and b.status in ('DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED')
    )
  order by
    p.id,
    case
      when p_pickup_lat is not null
       and p_pickup_lng is not null
       and d.current_latitude is not null
       and d.current_longitude is not null
      then
        power(d.current_latitude - p_pickup_lat, 2)
        + power(d.current_longitude - p_pickup_lng, 2)
      else null
    end asc nulls last,
    v.created_at asc;
$$;

revoke all on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) from public, anon;
grant execute on function public.find_available_drivers(timestamptz, timestamptz, double precision, double precision) to authenticated;

create or replace function public.accept_scheduled_booking(p_booking_id uuid)
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
    raise exception 'Bạn cần đăng nhập để nhận chuyến.' using errcode = '42501';
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
  returning * into v_booking;

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

revoke all on function public.accept_scheduled_booking(uuid) from public, anon;
grant execute on function public.accept_scheduled_booking(uuid) to authenticated;

create or replace function public.reject_scheduled_booking(p_booking_id uuid)
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

  select *
  into v_booking
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

revoke all on function public.reject_scheduled_booking(uuid) from public, anon;
grant execute on function public.reject_scheduled_booking(uuid) to authenticated;

create or replace function app_private.sync_driver_schedule_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.booking_mode <> 'scheduled' then
    return new;
  end if;

  if new.status in ('CUSTOMER_CANCELLED', 'DRIVER_CANCELLED', 'SCHEDULED_CANCELLED', 'EXPIRED') then
    update public.driver_schedules
    set status = 'cancelled',
        updated_at = now()
    where booking_id = new.id
      and status in ('reserved', 'accepted');
  elsif new.status = 'TRIP_COMPLETED' then
    update public.driver_schedules
    set status = 'completed',
        updated_at = now()
    where booking_id = new.id
      and status in ('reserved', 'accepted');
  end if;

  return new;
end;
$$;

drop trigger if exists sync_driver_schedule_from_booking on public.bookings;
create trigger sync_driver_schedule_from_booking
after update of status on public.bookings
for each row execute function app_private.sync_driver_schedule_from_booking();
