create table if not exists public.driver_booking_skips (
  driver_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reason text not null default 'dismissed',
  created_at timestamptz not null default now(),
  primary key (driver_id, booking_id)
);

alter table public.driver_booking_skips enable row level security;

grant select, insert, delete on public.driver_booking_skips to authenticated;

create policy "Drivers can read own skipped bookings"
  on public.driver_booking_skips
  for select
  to authenticated
  using ((select auth.uid()) = driver_id);

create policy "Drivers can insert own skipped bookings"
  on public.driver_booking_skips
  for insert
  to authenticated
  with check ((select auth.uid()) = driver_id);

create policy "Drivers can delete own skipped bookings"
  on public.driver_booking_skips
  for delete
  to authenticated
  using ((select auth.uid()) = driver_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_dispatches'
  ) then
    alter publication supabase_realtime add table public.booking_dispatches;
  end if;
end $$;
