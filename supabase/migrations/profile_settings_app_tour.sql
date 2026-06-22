alter table public.profile_settings
  add column if not exists has_seen_app_tour boolean not null default false;
