alter table public.drivers
  add column if not exists pause_until timestamptz;

create index if not exists drivers_pause_until_idx
  on public.drivers (pause_until)
  where pause_until is not null;
