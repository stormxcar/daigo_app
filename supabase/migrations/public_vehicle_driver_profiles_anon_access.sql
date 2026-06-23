revoke insert, update, delete, truncate, references, trigger on table public.vehicles from anon;
grant select on table public.vehicles to anon, authenticated;

grant select (id, full_name, phone, avatar_url) on table public.profiles to anon;

drop policy if exists "Public vehicle driver profiles are readable by anon" on public.profiles;
create policy "Public vehicle driver profiles are readable by anon"
on public.profiles
for select
to anon
using (
  exists (
    select 1
    from public.vehicles v
    where v.driver_id = profiles.id
  )
);
