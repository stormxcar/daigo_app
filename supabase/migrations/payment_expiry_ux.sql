alter table public.payments
  add column if not exists expires_at timestamptz;

drop policy if exists "Payment participants update lifecycle" on public.payments;
create policy "Payment participants update lifecycle"
on public.payments
for update
to authenticated
using (
  (
    (select auth.uid()) = customer_id
    and payment_status in ('pending', 'rejected')
  )
  or
  (
    (select auth.uid()) = driver_id
    and payment_status in ('pending', 'submitted')
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.driver_id = (select auth.uid())
    )
  )
)
with check (
  (
    (select auth.uid()) = customer_id
    and payment_status in ('submitted', 'expired')
    and verified_at is null
  )
  or
  (
    (select auth.uid()) = driver_id
    and payment_status in ('driver_verified', 'rejected')
  )
);

create or replace function app_private.sync_booking_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.payment_status = 'driver_verified' then
    update public.bookings
    set payment_status = 'paid',
        payment_method = new.payment_method,
        updated_at = now()
    where id = new.booking_id;
  elsif new.payment_status = 'submitted' then
    update public.bookings
    set payment_status = 'submitted',
        payment_method = new.payment_method,
        updated_at = now()
    where id = new.booking_id;
  elsif new.payment_status = 'rejected' then
    update public.bookings
    set payment_status = 'rejected',
        payment_method = new.payment_method,
        updated_at = now()
    where id = new.booking_id;
  elsif new.payment_status = 'expired' then
    update public.bookings
    set payment_status = 'expired',
        payment_method = new.payment_method,
        updated_at = now()
    where id = new.booking_id;
  elsif new.payment_status = 'pending' then
    update public.bookings
    set payment_status = 'pending',
        payment_method = new.payment_method,
        updated_at = now()
    where id = new.booking_id;
  end if;

  return new;
end;
$$;

revoke all on function app_private.sync_booking_payment_status() from anon, authenticated;
