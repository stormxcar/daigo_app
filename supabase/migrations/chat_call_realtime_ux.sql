alter table public.messages
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists message_kind text not null default 'text',
  add column if not exists call_session_id uuid references public.call_sessions(id) on delete set null,
  add column if not exists call_status text,
  add column if not exists call_duration_seconds integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_message_kind_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_message_kind_check
      check (message_kind in ('text', 'media', 'call'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_call_status_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_call_status_check
      check (
        call_status is null
        or call_status in ('ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')
      );
  end if;
end $$;

create unique index if not exists messages_call_session_id_unique_idx
on public.messages(call_session_id)
where call_session_id is not null;

create index if not exists messages_conversation_created_idx
on public.messages(conversation_id, created_at);

grant update (
  read,
  is_deleted,
  deleted_at,
  deleted_by
) on public.messages to authenticated;
