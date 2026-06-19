create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  chat_id uuid references public.conversations(id) on delete set null,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('agora', 'phone')),
  agora_channel text,
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')),
  started_at timestamptz,
  accepted_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists call_sessions_caller_id_idx on public.call_sessions(caller_id);
create index if not exists call_sessions_receiver_id_idx on public.call_sessions(receiver_id);
create index if not exists call_sessions_chat_id_idx on public.call_sessions(chat_id);
create index if not exists call_sessions_booking_id_idx on public.call_sessions(booking_id);
create index if not exists call_sessions_status_idx on public.call_sessions(status);

alter table public.call_sessions enable row level security;

revoke all on public.call_sessions from anon;
revoke all on public.call_sessions from authenticated;
grant select, insert on public.call_sessions to authenticated;
grant update (status, accepted_at, ended_at, duration_seconds, updated_at) on public.call_sessions to authenticated;

drop policy if exists "Call participants can view" on public.call_sessions;
create policy "Call participants can view"
on public.call_sessions
for select
to authenticated
using ((select auth.uid()) = caller_id or (select auth.uid()) = receiver_id);

drop policy if exists "Users create own call sessions" on public.call_sessions;
create policy "Users create own call sessions"
on public.call_sessions
for insert
to authenticated
with check (
  (select auth.uid()) = caller_id
  and caller_id <> receiver_id
  and status = 'ringing'
  and call_type in ('agora', 'phone')
);

drop policy if exists "Call participants update lifecycle" on public.call_sessions;
create policy "Call participants update lifecycle"
on public.call_sessions
for update
to authenticated
using ((select auth.uid()) = caller_id or (select auth.uid()) = receiver_id)
with check (
  ((select auth.uid()) = caller_id or (select auth.uid()) = receiver_id)
  and status in ('accepted', 'rejected', 'missed', 'ended', 'failed')
);

create schema if not exists app_private;

create or replace function app_private.set_call_session_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function app_private.set_call_session_updated_at() from anon, authenticated;

drop trigger if exists set_call_session_updated_at on public.call_sessions;
create trigger set_call_session_updated_at
before update on public.call_sessions
for each row execute function app_private.set_call_session_updated_at();
