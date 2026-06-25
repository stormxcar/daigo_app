create or replace function public.get_conversation_summaries(p_user_id uuid)
returns table (
  id uuid,
  thread_ids uuid[],
  booking_id uuid,
  participant_id uuid,
  participant_name text,
  participant_phone text,
  participant_avatar text,
  last_message text,
  last_message_time timestamptz,
  last_message_media_type text,
  unread_count bigint,
  updated_at timestamptz
)
language sql
stable
as $$
  with visible_conversations as (
    select
      c.id,
      c.booking_id,
      c.updated_at,
      case
        when c.customer_id = p_user_id then c.driver_id
        else c.customer_id
      end as participant_id
    from public.conversations c
    where (c.customer_id = p_user_id or c.driver_id = p_user_id)
      and not exists (
        select 1
        from public.conversation_user_hidden h
        where h.user_id = p_user_id
          and h.conversation_id = c.id
      )
  ),
  grouped as (
    select
      coalesce(participant_id, id) as grouping_id,
      (array_agg(id order by updated_at desc))[1] as id,
      array_agg(id order by updated_at desc) as thread_ids,
      (array_agg(booking_id order by updated_at desc))[1] as booking_id,
      participant_id,
      max(updated_at) as updated_at
    from visible_conversations
    group by coalesce(participant_id, id), participant_id
  )
  select
    g.id,
    g.thread_ids,
    g.booking_id,
    g.participant_id,
    coalesce(p.full_name, 'Tài xế sẽ xác nhận') as participant_name,
    p.phone as participant_phone,
    p.avatar_url as participant_avatar,
    coalesce(
      nullif(last_msg.text, ''),
      case
        when last_msg.media_type = 'image' then 'Đã gửi một ảnh'
        when last_msg.media_type = 'video' then 'Đã gửi một video'
        else 'Chưa có tin nhắn'
      end
    ) as last_message,
    last_msg.created_at as last_message_time,
    last_msg.media_type as last_message_media_type,
    coalesce(unread.unread_count, 0) as unread_count,
    g.updated_at
  from grouped g
  left join public.profiles p on p.id = g.participant_id
  left join lateral (
    select m.text, m.media_type, m.created_at
    from public.messages m
    where m.conversation_id = any(g.thread_ids)
    order by m.created_at desc
    limit 1
  ) last_msg on true
  left join lateral (
    select count(*)::bigint as unread_count
    from public.messages m
    where m.conversation_id = any(g.thread_ids)
      and m.sender_id <> p_user_id
      and coalesce(m.read, false) = false
  ) unread on true
  order by g.updated_at desc;
$$;

grant execute on function public.get_conversation_summaries(uuid) to authenticated;
