create or replace function public.create_app_notification(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_type text default 'system',
  p_related_booking_id uuid default null,
  p_related_post_id uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_booking public.bookings;
  v_post_driver_id uuid;
  v_notification public.notifications;
begin
  if v_actor is null then
    raise exception 'Bạn cần đăng nhập để tạo thông báo.' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Thiếu người nhận thông báo.' using errcode = '23502';
  end if;

  if p_related_booking_id is not null then
    select *
    into v_booking
    from public.bookings
    where id = p_related_booking_id;

    if not found then
      raise exception 'Không tìm thấy chuyến đi liên quan.' using errcode = 'P0002';
    end if;

    if v_actor not in (v_booking.customer_id, v_booking.driver_id)
       or p_user_id not in (v_booking.customer_id, v_booking.driver_id) then
      raise exception 'Bạn không có quyền tạo thông báo cho chuyến đi này.' using errcode = '42501';
    end if;
  elsif p_related_post_id is not null then
    select driver_id
    into v_post_driver_id
    from public.blog_posts
    where id = p_related_post_id;

    if not found then
      raise exception 'Không tìm thấy bài viết liên quan.' using errcode = 'P0002';
    end if;

    if p_user_id <> v_post_driver_id
       and p_user_id <> v_actor
       and not exists (
         select 1
         from public.blog_comments c
         where c.post_id = p_related_post_id
           and c.author_id = p_user_id
       ) then
      raise exception 'Bạn không có quyền tạo thông báo cho bài viết này.' using errcode = '42501';
    end if;
  elsif p_user_id <> v_actor then
    raise exception 'Không thể tạo thông báo cho người dùng khác khi thiếu quan hệ bảo mật.' using errcode = '42501';
  end if;

  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_booking_id,
    related_post_id
  )
  values (
    p_user_id,
    nullif(trim(p_title), ''),
    nullif(trim(p_content), ''),
    coalesce(nullif(trim(p_type), ''), 'system'),
    false,
    p_related_booking_id,
    p_related_post_id
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

revoke all on function public.create_app_notification(uuid, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.create_app_notification(uuid, text, text, text, uuid, uuid) to authenticated;
