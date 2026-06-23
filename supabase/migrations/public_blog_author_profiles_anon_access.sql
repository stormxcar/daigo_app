grant select (id, full_name, avatar_url) on table public.profiles to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Public blog author profiles are readable by anon'
  ) then
    create policy "Public blog author profiles are readable by anon"
      on public.profiles
      for select
      to anon
      using (
        exists (
          select 1
          from public.blog_posts bp
          where bp.driver_id = profiles.id
        )
      );
  end if;
end $$;
