-- Prevent placeholder chat threads like "Tai xe se xac nhan" from being created before a driver is assigned.
-- A conversation should exist only when both customer_id and driver_id are known.

create or replace function app_private.ensure_booking_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.customer_id is not null and new.driver_id is not null then
    insert into public.conversations (booking_id, customer_id, driver_id, updated_at)
    values (new.id, new.customer_id, new.driver_id, now())
    on conflict (booking_id) do update
    set customer_id = excluded.customer_id,
        driver_id = excluded.driver_id,
        updated_at = now()
    where public.conversations.customer_id is distinct from excluded.customer_id
       or public.conversations.driver_id is distinct from excluded.driver_id;
  end if;

  return new;
end;
$$;

revoke all on function app_private.ensure_booking_conversation() from anon, authenticated;

drop trigger if exists trg_ensure_booking_conversation on public.bookings;
create trigger trg_ensure_booking_conversation
after insert or update of customer_id, driver_id on public.bookings
for each row
execute function app_private.ensure_booking_conversation();

create or replace function app_private.dispatch_booking_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'SEARCHING_DRIVER' and new.driver_id is null then
    perform app_private.enqueue_next_booking_dispatch(new.id);
  end if;

  return new;
end;
$$;

revoke all on function app_private.dispatch_booking_after_insert() from anon, authenticated;

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
      and case
        when c.customer_id = p_user_id then c.driver_id
        else c.customer_id
      end is not null
      and not exists (
        select 1
        from public.conversation_user_hidden h
        where h.user_id = p_user_id
          and h.conversation_id = c.id
      )
  ),
  grouped as (
    select
      participant_id as grouping_id,
      (array_agg(id order by updated_at desc))[1] as id,
      array_agg(id order by updated_at desc) as thread_ids,
      (array_agg(booking_id order by updated_at desc))[1] as booking_id,
      participant_id,
      max(updated_at) as updated_at
    from visible_conversations
    group by participant_id
  )
  select
    g.id,
    g.thread_ids,
    g.booking_id,
    g.participant_id,
    coalesce(p.full_name, 'Người dùng') as participant_name,
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

-- Repair placeholder conversations for bookings that already have an assigned driver.
update public.conversations c
set customer_id = b.customer_id,
    driver_id = b.driver_id,
    updated_at = greatest(c.updated_at, b.updated_at)
from public.bookings b
where c.booking_id = b.id
  and c.driver_id is null
  and b.driver_id is not null;

-- Remove empty placeholder conversations that were created before a driver was assigned.
delete from public.conversations c
where c.driver_id is null
  and not exists (
    select 1
    from public.messages m
    where m.conversation_id = c.id
  );