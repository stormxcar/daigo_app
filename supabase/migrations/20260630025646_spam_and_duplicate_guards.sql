create or replace function app_private.normalize_location_address(p_address text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(p_address, ''))), '\s+', ' ', 'g');
$$;

create or replace function app_private.prevent_duplicate_saved_location()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if exists (
    select 1
    from public.saved_locations s
    where s.user_id = new.user_id
      and s.location_type = new.location_type
      and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and app_private.normalize_location_address(s.address) = app_private.normalize_location_address(new.address)
  ) then
    raise exception 'Địa điểm này đã có trong danh sách đã lưu.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function app_private.prevent_blog_comment_spam()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if exists (
    select 1
    from public.blog_comments c
    where c.author_id = new.author_id
      and c.post_id = new.post_id
      and c.created_at > now() - interval '10 seconds'
  ) then
    raise exception 'Bạn đang bình luận quá nhanh. Vui lòng thử lại sau vài giây.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.normalize_location_address(text) from public, anon, authenticated;
revoke all on function app_private.prevent_duplicate_saved_location() from public, anon, authenticated;
revoke all on function app_private.prevent_blog_comment_spam() from public, anon, authenticated;

drop trigger if exists prevent_duplicate_saved_location on public.saved_locations;
create trigger prevent_duplicate_saved_location
before insert or update on public.saved_locations
for each row
execute function app_private.prevent_duplicate_saved_location();

drop trigger if exists prevent_blog_comment_spam on public.blog_comments;
create trigger prevent_blog_comment_spam
before insert on public.blog_comments
for each row
execute function app_private.prevent_blog_comment_spam();

create or replace function app_private.prevent_duplicate_active_call()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.call_type <> 'agora' or new.status not in ('ringing', 'accepted') then
    return new;
  end if;

  if exists (
    select 1
    from public.call_sessions c
    where c.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.call_type = 'agora'
      and c.status in ('ringing', 'accepted')
      and least(c.caller_id, c.receiver_id) = least(new.caller_id, new.receiver_id)
      and greatest(c.caller_id, c.receiver_id) = greatest(new.caller_id, new.receiver_id)
      and coalesce(c.chat_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          coalesce(new.chat_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Đang có một cuộc gọi chưa kết thúc giữa hai người dùng này.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_duplicate_active_call() from public, anon, authenticated;

drop trigger if exists prevent_duplicate_active_call on public.call_sessions;
create trigger prevent_duplicate_active_call
before insert or update of status on public.call_sessions
for each row
execute function app_private.prevent_duplicate_active_call();
