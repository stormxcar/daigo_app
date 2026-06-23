create table if not exists public.conversation_user_hidden (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

alter table public.conversation_user_hidden enable row level security;

revoke all on public.conversation_user_hidden from anon;
revoke all on public.conversation_user_hidden from authenticated;
grant select, insert, update, delete on public.conversation_user_hidden to authenticated;

drop policy if exists "Users read own hidden conversations" on public.conversation_user_hidden;
create policy "Users read own hidden conversations"
on public.conversation_user_hidden
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users hide own conversations" on public.conversation_user_hidden;
create policy "Users hide own conversations"
on public.conversation_user_hidden
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_user_hidden.conversation_id
      and (c.customer_id = (select auth.uid()) or c.driver_id = (select auth.uid()))
  )
);

drop policy if exists "Users update own hidden conversations" on public.conversation_user_hidden;
create policy "Users update own hidden conversations"
on public.conversation_user_hidden
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users unhide own conversations" on public.conversation_user_hidden;
create policy "Users unhide own conversations"
on public.conversation_user_hidden
for delete
to authenticated
using (user_id = (select auth.uid()));
