alter table public.bookings
  add column if not exists idempotency_key text;

create unique index if not exists bookings_customer_idempotency_key_unique
on public.bookings (customer_id, idempotency_key)
where idempotency_key is not null;

comment on column public.bookings.idempotency_key is
  'Client-generated request key used to make booking creation idempotent per customer.';
