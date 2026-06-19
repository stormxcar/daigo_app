create or replace function app_private.dispatch_booking_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.conversations (booking_id, customer_id, driver_id)
  values (new.id, new.customer_id, null)
  on conflict (booking_id) do nothing;

  if new.status = 'SEARCHING_DRIVER' and new.driver_id is null then
    perform app_private.enqueue_next_booking_dispatch(new.id);
  end if;

  return new;
end;
$$;

revoke all on function app_private.dispatch_booking_after_insert() from anon, authenticated;
