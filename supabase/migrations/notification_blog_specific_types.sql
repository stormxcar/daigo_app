create or replace function app_private.notify_blog_owner_interaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  post_owner uuid;
  actor_name text;
  notification_title text;
  notification_content text;
  notification_type text;
begin
  select bp.driver_id into post_owner
  from public.blog_posts bp
  where bp.id = new.post_id;

  if post_owner is null then
    return new;
  end if;

  if tg_table_name = 'blog_comments' then
    if new.author_id = post_owner then
      return new;
    end if;
    select full_name into actor_name from public.profiles where id = new.author_id;
    notification_title := case when new.parent_comment_id is null then 'Có bình luận mới' else 'Có trả lời bình luận mới' end;
    notification_content := coalesce(actor_name, 'Khách hàng') || ': ' || left(coalesce(new.text, 'đã bình luận về bài viết của bạn.'), 180);
    notification_type := 'blog_commented';
  else
    if new.user_id = post_owner then
      return new;
    end if;
    select full_name into actor_name from public.profiles where id = new.user_id;
    notification_title := 'Bài viết có lượt thích mới';
    notification_content := coalesce(actor_name, 'Khách hàng') || ' vừa thả tim bài viết của bạn.';
    notification_type := 'blog_liked';
  end if;

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
    notification_type,
    false,
    new.post_id
  );

  return new;
end;
$$;
