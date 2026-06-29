create or replace function app_private.normalize_vietnam_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') = '' then ''
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') like '+%' then regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') like '84%' then '+' || regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')
    when regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') like '0%' then '+84' || substring(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g') from 2)
    else '+84' || regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g')
  end;
$$;

revoke all on function app_private.normalize_vietnam_phone(text) from public, anon, authenticated;

create unique index if not exists profiles_unique_normalized_phone
on public.profiles (app_private.normalize_vietnam_phone(phone))
where app_private.normalize_vietnam_phone(phone) <> '';

create or replace function public.is_phone_available(p_phone text)
returns boolean
language sql
security definer
set search_path = public, app_private
as $$
  select not exists (
    select 1
    from public.profiles p
    where app_private.normalize_vietnam_phone(p.phone) = app_private.normalize_vietnam_phone(p_phone)
      and app_private.normalize_vietnam_phone(p.phone) <> ''
  );
$$;

revoke all on function public.is_phone_available(text) from public, anon, authenticated;
grant execute on function public.is_phone_available(text) to anon, authenticated;
