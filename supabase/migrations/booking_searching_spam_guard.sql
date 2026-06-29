create or replace function app_private.prevent_searching_booking_spam()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_existing_count integer;
begin
  if new.status <> 'SEARCHING_DRIVER' then
    return new;
  end if;

  select count(*)
  into v_existing_count
  from public.bookings b
  where b.customer_id = new.customer_id
    and b.status = 'SEARCHING_DRIVER';

  if v_existing_count >= 3 then
    raise exception 'Bạn đang có quá nhiều yêu cầu đặt xe đang tìm tài xế. Vui lòng hủy hoặc chờ xử lý trước khi đặt tiếp.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_searching_booking_spam() from public, anon, authenticated;

drop trigger if exists prevent_searching_booking_spam on public.bookings;
create trigger prevent_searching_booking_spam
before insert on public.bookings
for each row
execute function app_private.prevent_searching_booking_spam();
