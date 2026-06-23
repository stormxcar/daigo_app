create table if not exists public.app_update_policies (
  platform text primary key check (platform in ('android', 'ios')),
  enabled boolean not null default true,
  force_update boolean not null default false,
  min_version text not null default '1.0.0',
  latest_version text,
  min_build_number integer not null default 1,
  latest_build_number integer,
  update_url text,
  release_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_update_policies enable row level security;

grant select on table public.app_update_policies to anon, authenticated;

drop policy if exists "Public app update policies are readable" on public.app_update_policies;
create policy "Public app update policies are readable"
on public.app_update_policies
for select
to anon, authenticated
using (enabled = true);

insert into public.app_update_policies (
  platform,
  enabled,
  force_update,
  min_version,
  latest_version,
  min_build_number,
  latest_build_number,
  update_url,
  release_notes
)
values (
  'android',
  true,
  false,
  '1.0.0',
  '1.0.0',
  1,
  1,
  null,
  'Phiên bản khởi tạo chính sách cập nhật.'
)
on conflict (platform) do nothing;
