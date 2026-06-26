-- RLS fixes for scheduled booking notification/deep-link flow.

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
    and status in ('SEARCHING_DRIVER', 'SCHEDULED_PENDING_DRIVER')
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'driver'
    )
  )
);

drop policy if exists "Customers notify drivers for own booking" on public.notifications;
create policy "Customers notify recipients for own booking"
on public.notifications
for insert
to authenticated
with check (
  related_booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = notifications.related_booking_id
      and b.customer_id = (select auth.uid())
      and notifications.user_id <> (select auth.uid())
  )
);

drop policy if exists "Drivers receive pending booking notifications" on public.notifications;
create policy "Drivers receive pending booking notifications"
on public.notifications
for insert
to authenticated
with check (
  related_booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = notifications.related_booking_id
      and b.customer_id = (select auth.uid())
      and b.driver_id is null
      and b.status in ('SEARCHING_DRIVER', 'SCHEDULED_PENDING_DRIVER')
  )
);
