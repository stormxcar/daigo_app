alter table public.notifications
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists call_session_id uuid references public.call_sessions(id) on delete set null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'booking_success',
      'driver_confirm',
      'driver_cancel',
      'trip_done',
      'booking_update',
      'payment_update',
      'blog_interaction',
      'incoming_call',
      'missed_call',
      'chat_message',
      'booking_created',
      'booking_accepted',
      'booking_cancelled',
      'scheduled_reminder',
      'payment_submitted',
      'payment_verified',
      'blog_liked',
      'blog_commented',
      'system'
    )
  );

create or replace function app_private.send_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.read = false then
    perform app_private.call_send_push_notification(
      new.user_id,
      coalesce(new.title, 'Thông báo Daigo'),
      coalesce(new.content, ''),
      jsonb_build_object(
        'notification_id', new.id,
        'type', coalesce(new.type, 'system'),
        'related_booking_id', new.related_booking_id,
        'related_post_id', new.related_post_id,
        'conversation_id', new.conversation_id,
        'call_session_id', new.call_session_id
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.create_app_notification(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_type text default 'system',
  p_related_booking_id uuid default null,
  p_related_post_id uuid default null,
  p_conversation_id uuid default null,
  p_call_session_id uuid default null
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
  v_conversation public.conversations;
  v_call public.call_sessions;
  v_notification public.notifications;
begin
  if v_actor is null then
    raise exception 'Bạn cần đăng nhập để tạo thông báo.' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'Thiếu người nhận thông báo.' using errcode = '23502';
  end if;

  if p_related_booking_id is not null then
    select * into v_booking from public.bookings where id = p_related_booking_id;
    if not found then
      raise exception 'Không tìm thấy chuyến đi liên quan.' using errcode = 'P0002';
    end if;

    if v_actor not in (v_booking.customer_id, v_booking.driver_id)
       or p_user_id not in (v_booking.customer_id, v_booking.driver_id) then
      raise exception 'Bạn không có quyền tạo thông báo cho chuyến đi này.' using errcode = '42501';
    end if;
  end if;

  if p_related_post_id is not null then
    select driver_id into v_post_driver_id from public.blog_posts where id = p_related_post_id;
    if not found then
      raise exception 'Không tìm thấy bài viết liên quan.' using errcode = 'P0002';
    end if;

    if p_user_id <> v_post_driver_id
       and p_user_id <> v_actor
       and not exists (
         select 1 from public.blog_comments c
         where c.post_id = p_related_post_id
           and c.author_id = p_user_id
       ) then
      raise exception 'Bạn không có quyền tạo thông báo cho bài viết này.' using errcode = '42501';
    end if;
  end if;

  if p_conversation_id is not null then
    select * into v_conversation from public.conversations where id = p_conversation_id;
    if not found then
      raise exception 'Không tìm thấy cuộc trò chuyện liên quan.' using errcode = 'P0002';
    end if;

    if v_actor not in (v_conversation.customer_id, v_conversation.driver_id)
       or p_user_id not in (v_conversation.customer_id, v_conversation.driver_id) then
      raise exception 'Bạn không có quyền tạo thông báo cho cuộc trò chuyện này.' using errcode = '42501';
    end if;
  end if;

  if p_call_session_id is not null then
    select * into v_call from public.call_sessions where id = p_call_session_id;
    if not found then
      raise exception 'Không tìm thấy cuộc gọi liên quan.' using errcode = 'P0002';
    end if;

    if v_actor not in (v_call.caller_id, v_call.receiver_id)
       or p_user_id not in (v_call.caller_id, v_call.receiver_id) then
      raise exception 'Bạn không có quyền tạo thông báo cho cuộc gọi này.' using errcode = '42501';
    end if;
  end if;

  if p_related_booking_id is null
     and p_related_post_id is null
     and p_conversation_id is null
     and p_call_session_id is null
     and p_user_id <> v_actor then
    raise exception 'Không thể tạo thông báo cho người dùng khác khi thiếu quan hệ bảo mật.' using errcode = '42501';
  end if;

  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_booking_id,
    related_post_id,
    conversation_id,
    call_session_id
  )
  values (
    p_user_id,
    nullif(trim(p_title), ''),
    nullif(trim(p_content), ''),
    coalesce(nullif(trim(p_type), ''), 'system'),
    false,
    p_related_booking_id,
    p_related_post_id,
    p_conversation_id,
    p_call_session_id
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

revoke all on function public.create_app_notification(uuid, text, text, text, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.create_app_notification(uuid, text, text, text, uuid, uuid, uuid, uuid) to authenticated;

drop function if exists public.create_app_notification(uuid, text, text, text, uuid, uuid);
