alter table public.driver_schedules
  add column if not exists block_kind text not null default 'custom',
  add column if not exists repeat_group_id uuid,
  add column if not exists repeat_until date,
  add column if not exists note text;

alter table public.driver_schedules
  drop constraint if exists driver_schedules_block_kind_check,
  add constraint driver_schedules_block_kind_check
    check (block_kind in ('all_day', 'custom'));

create index if not exists driver_schedules_repeat_group_idx
on public.driver_schedules (driver_id, repeat_group_id)
where repeat_group_id is not null;
