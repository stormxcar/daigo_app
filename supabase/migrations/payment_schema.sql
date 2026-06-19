alter table public.profiles
  add column if not exists bank_name text,
  add column if not exists bank_code text,
  add column if not exists bank_bin text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder text;

alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_method text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_payment_status_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (payment_status in ('unpaid', 'pending', 'submitted', 'paid', 'rejected', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bookings_payment_method_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_method_check
      check (payment_method is null or payment_method in ('cash', 'bank_transfer', 'vietqr'));
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank_transfer', 'vietqr')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'submitted', 'driver_verified', 'rejected', 'expired')),
  bank_name text,
  bank_code text,
  bank_bin text,
  bank_account_number text,
  bank_account_holder text,
  transfer_content text not null unique,
  qr_url text,
  proof_image_url text,
  driver_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  verified_at timestamptz,
  rejected_at timestamptz
);

create unique index if not exists payments_one_active_per_booking
  on public.payments(booking_id)
  where payment_status in ('pending', 'submitted', 'driver_verified');

create index if not exists payments_customer_id_idx on public.payments(customer_id);
create index if not exists payments_driver_id_idx on public.payments(driver_id);
create index if not exists payments_booking_id_idx on public.payments(booking_id);

alter table public.payments enable row level security;

revoke all on public.payments from anon;
revoke all on public.payments from authenticated;
grant select, insert on public.payments to authenticated;
grant update (
  payment_status,
  proof_image_url,
  driver_note,
  submitted_at,
  verified_at,
  rejected_at,
  updated_at
) on public.payments to authenticated;

drop policy if exists "Payments participants can view" on public.payments;
create policy "Payments participants can view"
on public.payments
for select
to authenticated
using ((select auth.uid()) = customer_id or (select auth.uid()) = driver_id);

drop policy if exists "Customers create payment for own assigned booking" on public.payments;
create policy "Customers create payment for own assigned booking"
on public.payments
for insert
to authenticated
with check (
  (select auth.uid()) = customer_id
  and payment_status = 'pending'
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.customer_id = (select auth.uid())
      and b.driver_id = driver_id
      and b.driver_id is not null
      and amount = coalesce(b.actual_price, b.estimated_price)
  )
);

drop policy if exists "Customers submit own payment proof" on public.payments;
drop policy if exists "Customers mark own transfer submitted" on public.payments;
drop policy if exists "Drivers verify assigned payment" on public.payments;
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
    and payment_status = 'submitted'
    and verified_at is null
  )
  or
  (
    (select auth.uid()) = driver_id
    and payment_status in ('driver_verified', 'rejected')
  )
);

alter table public.payments
  alter column bank_name drop not null,
  alter column bank_account_number drop not null,
  alter column bank_account_holder drop not null;

alter table public.payments
  drop constraint if exists payments_payment_method_check;

alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash', 'bank_transfer', 'vietqr'));

alter table public.bookings
  drop constraint if exists bookings_payment_method_check;

alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'bank_transfer', 'vietqr'));

create schema if not exists app_private;

create or replace function app_private.set_payment_updated_at()
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

revoke all on function app_private.set_payment_updated_at() from anon, authenticated;

drop trigger if exists set_payment_updated_at on public.payments;
create trigger set_payment_updated_at
before update on public.payments
for each row execute function app_private.set_payment_updated_at();

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

drop trigger if exists sync_booking_payment_status on public.payments;
create trigger sync_booking_payment_status
after insert or update of payment_status on public.payments
for each row execute function app_private.sync_booking_payment_status();
