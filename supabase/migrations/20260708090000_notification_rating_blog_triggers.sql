alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type = any (array[
      'booking_success'::text,
      'driver_confirm'::text,
      'driver_cancel'::text,
      'trip_done'::text,
      'booking_update'::text,
      'payment_update'::text,
      'blog_interaction'::text,
      'incoming_call'::text,
      'missed_call'::text,
      'chat_message'::text,
      'booking_created'::text,
      'booking_accepted'::text,
      'booking_cancelled'::text,
      'scheduled_reminder'::text,
      'payment_submitted'::text,
      'payment_verified'::text,
      'blog_liked'::text,
      'blog_commented'::text,
      'rating_received'::text,
      'blog_post_created'::text,
      'system'::text
    ])
  );

create or replace function app_private.notify_rating_received()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_name text;
  notification_content text;
begin
  if new.to_user_id is null or new.from_user_id = new.to_user_id then
    return new;
  end if;

  select nullif(trim(full_name), '')
    into actor_name
  from public.profiles
  where id = new.from_user_id;

  notification_content := coalesce(actor_name, 'Người dùng') || ' đã đánh giá bạn ' || new.rating::text || '/5 sao.';

  if nullif(trim(coalesce(new.comment, '')), '') is not null then
    notification_content := notification_content || ' "' || left(trim(new.comment), 160) || '"';
  end if;

  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_booking_id
  ) values (
    new.to_user_id,
    'Bạn có đánh giá mới',
    notification_content,
    'rating_received',
    false,
    new.booking_id
  );

  return new;
end;
$$;

revoke execute on function app_private.notify_rating_received() from public, anon, authenticated;

drop trigger if exists trg_notify_rating_received on public.ratings;
create trigger trg_notify_rating_received
after insert on public.ratings
for each row
execute function app_private.notify_rating_received();

create or replace function app_private.notify_blog_post_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  driver_name text;
  notification_content text;
begin
  select nullif(trim(full_name), '')
    into driver_name
  from public.profiles
  where id = new.driver_id;

  notification_content := coalesce(driver_name, 'Tài xế') || ' vừa đăng bài mới';

  if nullif(trim(coalesce(new.caption, '')), '') is not null then
    notification_content := notification_content || ': ' || left(trim(new.caption), 180);
  else
    notification_content := notification_content || '.';
  end if;

  with recipients as (
    select b.customer_id as user_id
    from public.bookings b
    where b.driver_id = new.driver_id
      and b.customer_id is not null

    union

    select bl.user_id
    from public.blog_likes bl
    join public.blog_posts bp on bp.id = bl.post_id
    where bp.driver_id = new.driver_id
      and bl.user_id is not null

    union

    select bc.author_id as user_id
    from public.blog_comments bc
    join public.blog_posts bp on bp.id = bc.post_id
    where bp.driver_id = new.driver_id
      and bc.author_id is not null
  )
  insert into public.notifications (
    user_id,
    title,
    content,
    type,
    read,
    related_post_id
  )
  select distinct
    recipients.user_id,
    'Bài viết mới từ tài xế',
    notification_content,
    'blog_post_created',
    false,
    new.id
  from recipients
  where recipients.user_id is not null
    and recipients.user_id <> new.driver_id;

  return new;
end;
$$;

revoke execute on function app_private.notify_blog_post_created() from public, anon, authenticated;

drop trigger if exists trg_notify_blog_post_created on public.blog_posts;
create trigger trg_notify_blog_post_created
after insert on public.blog_posts
for each row
execute function app_private.notify_blog_post_created();

create or replace function app_private.notify_blog_owner_interaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  post_owner uuid;
  actor_id uuid;
  actor_name text;
  notification_title text;
  notification_content text;
  parent_comment_author uuid;
begin
  if tg_table_name = 'blog_comments' then
    actor_id := new.author_id;

    select bp.driver_id
      into post_owner
    from public.blog_posts bp
    where bp.id = new.post_id;

    if post_owner is null then
      return new;
    end if;

    select nullif(trim(full_name), '')
      into actor_name
    from public.profiles
    where id = actor_id;

    notification_title := case
      when new.parent_comment_id is null then 'Có bình luận mới'
      else 'Có trả lời bình luận mới'
    end;
    notification_content := coalesce(actor_name, 'Người dùng') || ': ' || left(coalesce(new.text, ''), 180);

    if actor_id <> post_owner then
      insert into public.notifications (
        user_id,
        title,
        content,
        type,
        read,
        related_post_id
      ) values (
        post_owner,
        notification_title,
        notification_content,
        'blog_commented',
        false,
        new.post_id
      );
    end if;

    if new.parent_comment_id is not null then
      select bc.author_id
        into parent_comment_author
      from public.blog_comments bc
      where bc.id = new.parent_comment_id;

      if parent_comment_author is not null
        and parent_comment_author <> actor_id
        and parent_comment_author <> post_owner then
        insert into public.notifications (
          user_id,
          title,
          content,
          type,
          read,
          related_post_id
        ) values (
          parent_comment_author,
          'Có người trả lời bình luận của bạn',
          notification_content,
          'blog_commented',
          false,
          new.post_id
        );
      end if;
    end if;

    return new;
  end if;

  if tg_table_name = 'blog_likes' then
    actor_id := new.user_id;

    select bp.driver_id
      into post_owner
    from public.blog_posts bp
    where bp.id = new.post_id;

    if post_owner is null or actor_id = post_owner then
      return new;
    end if;

    select nullif(trim(full_name), '')
      into actor_name
    from public.profiles
    where id = actor_id;

    insert into public.notifications (
      user_id,
      title,
      content,
      type,
      read,
      related_post_id
    ) values (
      post_owner,
      'Bài viết có lượt thích mới',
      coalesce(actor_name, 'Người dùng') || ' đã thích bài viết của bạn.',
      'blog_liked',
      false,
      new.post_id
    );

    return new;
  end if;

  return new;
end;
$$;

revoke execute on function app_private.notify_blog_owner_interaction() from public, anon, authenticated;
