alter table public.profiles
  add column if not exists account_type text not null default 'customer',
  add column if not exists phone_verified boolean not null default false,
  add column if not exists driver_onboarding_status text not null default 'incomplete',
  add column if not exists kyc_status text not null default 'incomplete';

alter table public.profiles
  drop constraint if exists profiles_account_type_check,
  add constraint profiles_account_type_check check (account_type in ('customer', 'driver', 'both'));

alter table public.profiles
  drop constraint if exists profiles_driver_onboarding_status_check,
  add constraint profiles_driver_onboarding_status_check check (driver_onboarding_status in ('incomplete', 'submitted', 'completed'));

alter table public.profiles
  drop constraint if exists profiles_kyc_status_check,
  add constraint profiles_kyc_status_check check (kyc_status in ('incomplete', 'pending', 'approved', 'rejected'));

alter table public.drivers
  add column if not exists cccd_number text,
  add column if not exists license_number text,
  add column if not exists document_urls text[] not null default '{}';

revoke insert, update on public.profiles from authenticated;
grant insert (id, full_name, email, phone, avatar_url, address, bank_name, bank_code, bank_bin, bank_account_number, bank_account_holder)
on public.profiles to authenticated;
grant update (full_name, email, phone, avatar_url, address, bank_name, bank_code, bank_bin, bank_account_number, bank_account_holder)
on public.profiles to authenticated;
grant select on public.profiles to authenticated;
revoke all on public.profiles from anon;
grant insert, update on public.profiles to authenticated;
revoke delete, truncate, references, trigger on public.profiles from authenticated;

alter table public.profiles
  add column if not exists phone_verified_at timestamp with time zone;

create or replace function public.prevent_profile_sensitive_column_changes()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.role is distinct from old.role
    or new.account_type is distinct from old.account_type
    or new.email_verified is distinct from old.email_verified
    or new.phone_verified is distinct from old.phone_verified
    or new.phone_verified_at is distinct from old.phone_verified_at
    or new.driver_onboarding_status is distinct from old.driver_onboarding_status
    or new.kyc_status is distinct from old.kyc_status
  ) then
    raise exception 'Khong du quyen cap nhat cot bao mat cua ho so.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_sensitive_column_changes on public.profiles;
create trigger prevent_profile_sensitive_column_changes
before update on public.profiles
for each row execute function public.prevent_profile_sensitive_column_changes();

revoke all on function public.prevent_profile_sensitive_column_changes() from public, anon, authenticated;

drop function if exists public.handle_new_user() cascade;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, avatar_url, role, account_type, email_verified, phone_verified
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), split_part(coalesce(new.phone, ''), '+', 2), 'Nguoi dung Daigo'),
    coalesce(new.email, ''),
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'avatar_url',
    'customer',
    'customer',
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    email_verified = excluded.email_verified,
    phone_verified = excluded.phone_verified,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email_verified()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.profiles
  set email_verified = new.email_confirmed_at is not null,
      phone = coalesce(new.phone, public.profiles.phone),
      phone_verified = new.phone_confirmed_at is not null,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email_confirmed_at, phone_confirmed_at, phone, email, raw_user_meta_data on auth.users
for each row execute function public.sync_profile_email_verified();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_profile_email_verified() from public, anon, authenticated;

create schema if not exists app_private;

create or replace function app_private.start_driver_onboarding(
  p_full_name text,
  p_email text default null,
  p_avatar_url text default null,
  p_cccd_number text default null,
  p_license_number text default null,
  p_document_urls text[] default '{}'
)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_profile public.profiles;
  v_user_id uuid := auth.uid();
  v_has_docs boolean := coalesce(array_length(p_document_urls, 1), 0) > 0
    or nullif(trim(coalesce(p_cccd_number, '')), '') is not null
    or nullif(trim(coalesce(p_license_number, '')), '') is not null;
begin
  if v_user_id is null then
    raise exception 'Ban can dang nhap de dang ky tai xe.' using errcode = '28000';
  end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      email = coalesce(nullif(trim(coalesce(p_email, '')), ''), email),
      avatar_url = coalesce(nullif(trim(coalesce(p_avatar_url, '')), ''), avatar_url),
      role = 'driver',
      account_type = case when account_type = 'customer' then 'both' else 'driver' end,
      phone_verified = true,
      driver_onboarding_status = case when v_has_docs then 'submitted' else 'incomplete' end,
      kyc_status = case when v_has_docs then 'pending' else 'incomplete' end,
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  if not found then
    raise exception 'Khong tim thay ho so nguoi dung.' using errcode = 'P0002';
  end if;

  insert into public.drivers (profile_id, verification_status, is_online, cccd_number, license_number, document_urls)
  values (
    v_user_id,
    case when v_has_docs then 'PENDING' else 'APPROVED' end,
    false,
    nullif(trim(coalesce(p_cccd_number, '')), ''),
    nullif(trim(coalesce(p_license_number, '')), ''),
    coalesce(p_document_urls, '{}')
  )
  on conflict (profile_id) do update set
    cccd_number = coalesce(excluded.cccd_number, public.drivers.cccd_number),
    license_number = coalesce(excluded.license_number, public.drivers.license_number),
    document_urls = case when coalesce(array_length(excluded.document_urls, 1), 0) > 0 then excluded.document_urls else public.drivers.document_urls end,
    verification_status = case when v_has_docs then 'PENDING' else public.drivers.verification_status end,
    updated_at = now();

  return v_profile;
end;
$$;

revoke all on function app_private.start_driver_onboarding(text, text, text, text, text, text[]) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.start_driver_onboarding(text, text, text, text, text, text[]) to authenticated;

create or replace function public.start_driver_onboarding(
  p_full_name text,
  p_email text default null,
  p_avatar_url text default null,
  p_cccd_number text default null,
  p_license_number text default null,
  p_document_urls text[] default '{}'
)
returns public.profiles
language sql
security invoker
set search_path to ''
as $$
  select app_private.start_driver_onboarding(
    p_full_name,
    p_email,
    p_avatar_url,
    p_cccd_number,
    p_license_number,
    p_document_urls
  );
$$;

grant execute on function public.start_driver_onboarding(text, text, text, text, text, text[]) to authenticated;

create or replace function app_private.verify_test_phone_otp(
  p_phone text,
  p_token text
)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_profile public.profiles;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Ban can dang nhap bang email hoac Google truoc.' using errcode = '28000';
  end if;

  if p_token <> '123456' then
    raise exception 'Ma OTP test khong hop le.' using errcode = '22023';
  end if;

  update public.profiles
  set phone = p_phone,
      phone_verified = true,
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  if not found then
    raise exception 'Khong tim thay ho so nguoi dung.' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function app_private.verify_test_phone_otp(text, text) from public;
grant execute on function app_private.verify_test_phone_otp(text, text) to authenticated;

create or replace function public.verify_test_phone_otp(
  p_phone text,
  p_token text
)
returns public.profiles
language sql
security invoker
set search_path to ''
as $$
  select app_private.verify_test_phone_otp(p_phone, p_token);
$$;

grant execute on function public.verify_test_phone_otp(text, text) to authenticated;

create or replace function app_private.mark_phone_verified(
  p_phone text
)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_profile public.profiles;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Ban can dang nhap bang Supabase truoc.' using errcode = '28000';
  end if;

  update public.profiles
  set phone = p_phone,
      phone_verified = true,
      phone_verified_at = now(),
      updated_at = now()
  where id = v_user_id
  returning * into v_profile;

  if not found then
    raise exception 'Khong tim thay ho so nguoi dung.' using errcode = 'P0002';
  end if;

  return v_profile;
end;
$$;

revoke all on function app_private.mark_phone_verified(text) from public;
grant execute on function app_private.mark_phone_verified(text) to authenticated;

create or replace function public.mark_phone_verified(
  p_phone text
)
returns public.profiles
language sql
security invoker
set search_path to ''
as $$
  select app_private.mark_phone_verified(p_phone);
$$;

grant execute on function public.mark_phone_verified(text) to authenticated;
