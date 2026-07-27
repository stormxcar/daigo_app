-- Enable Supabase realtime for live app tables that must not stay stale across tabs/devices.

do $$
declare
  v_table regclass;
  v_tables text[] := array[
    'public.blog_posts',
    'public.blog_comments',
    'public.blog_likes',
    'public.payments',
    'public.vehicles',
    'public.profiles',
    'public.ratings'
  ];
  v_name text;
begin
  foreach v_name in array v_tables loop
    v_table := to_regclass(v_name);
    if v_table is not null and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = split_part(v_name, '.', 1)
        and tablename = split_part(v_name, '.', 2)
    ) then
      execute format('alter publication supabase_realtime add table %s', v_name);
    end if;
  end loop;
end $$;