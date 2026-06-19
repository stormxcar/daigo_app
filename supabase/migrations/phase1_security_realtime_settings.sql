create schema if not exists app_private;

create table if not exists public.profile_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  location_sharing_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_settings enable row level security;

revoke all on public.profile_settings from anon;
revoke all on public.profile_settings from authenticated;
grant select, insert, update on public.profile_settings to authenticated;

drop policy if exists "Users read own profile settings" on public.profile_settings;
create policy "Users read own profile settings"
on public.profile_settings
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create own profile settings" on public.profile_settings;
create policy "Users create own profile settings"
on public.profile_settings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own profile settings" on public.profile_settings;
create policy "Users update own profile settings"
on public.profile_settings
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function app_private.set_profile_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_profile_settings_updated_at() from anon, authenticated;

drop trigger if exists set_profile_settings_updated_at on public.profile_settings;
create trigger set_profile_settings_updated_at
before update on public.profile_settings
for each row execute function app_private.set_profile_settings_updated_at();

drop policy if exists "Customers and drivers read bookings" on public.bookings;
drop policy if exists "Booking participants and available drivers can read bookings" on public.bookings;
create policy "Booking participants and available drivers can read bookings"
on public.bookings
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or driver_id = (select auth.uid())
  or (
    driver_id is null
    and status = 'SEARCHING_DRIVER'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'driver'
    )
  )
);

drop policy if exists "Customers and drivers update bookings" on public.bookings;
drop policy if exists "Customers update own cancellable bookings" on public.bookings;
drop policy if exists "Assigned drivers update own bookings" on public.bookings;
drop policy if exists "Approved drivers accept unassigned bookings" on public.bookings;

create policy "Customers update own cancellable bookings"
on public.bookings
for update
to authenticated
using (customer_id = (select auth.uid()))
with check (
  customer_id = (select auth.uid())
  and status in ('CREATED', 'SEARCHING_DRIVER', 'CUSTOMER_CANCELLED', 'EXPIRED')
);

create policy "Assigned drivers update own bookings"
on public.bookings
for update
to authenticated
using (driver_id = (select auth.uid()))
with check (
  driver_id = (select auth.uid())
  and status in (
    'DRIVER_ACCEPTED',
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'TRIP_STARTED',
    'TRIP_COMPLETED',
    'DRIVER_CANCELLED'
  )
);

create policy "Approved drivers accept unassigned bookings"
on public.bookings
for update
to authenticated
using (
  driver_id is null
  and status = 'SEARCHING_DRIVER'
  and exists (
    select 1
    from public.profiles p
    left join public.drivers d on d.profile_id = p.id
    where p.id = (select auth.uid())
      and p.role = 'driver'
      and coalesce(d.is_online, false) = true
      and coalesce(d.verification_status, 'PENDING') = 'APPROVED'
  )
)
with check (
  driver_id = (select auth.uid())
  and status = 'DRIVER_ACCEPTED'
);

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
      'system'
    )
  );
