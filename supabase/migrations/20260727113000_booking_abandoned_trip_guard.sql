create schema if not exists app_private;
create extension if not exists pg_cron with schema extensions;

alter table public.bookings
  add column if not exists last_driver_action_at timestamptz,
  add column if not exists last_customer_action_at timestamptz,
  add column if not exists last_driver_location_at timestamptz,
  add column if not exists timeout_warning_sent_at timestamptz,
  add column if not exists timeout_stage text,
  add column if not exists requires_admin_review boolean not null default false;

create table if not exists public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null default 'system' check (actor_type in ('customer', 'driver', 'system', 'admin')),
  actor_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_status_events_booking_created_idx
  on public.booking_status_events (booking_id, created_at desc);

alter table public.booking_status_events enable row level security;

drop policy if exists "booking status events participants read" on public.booking_status_events;
create policy "booking status events participants read"
on public.booking_status_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_status_events.booking_id
      and (b.customer_id = auth.uid() or b.driver_id = auth.uid())
  )
);

create table if not exists public.driver_reliability_events (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  event_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists driver_reliability_events_driver_created_idx
  on public.driver_reliability_events (driver_id, created_at desc);

alter table public.driver_reliability_events enable row level security;

drop policy if exists "drivers read own reliability events" on public.driver_reliability_events;
create policy "drivers read own reliability events"
on public.driver_reliability_events
for select
to authenticated
using (driver_id = auth.uid());

create or replace function app_private.touch_booking_action_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.last_customer_action_at := coalesce(new.last_customer_action_at, new.created_at, now());
    if new.driver_id is not null or new.status in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING') then
      new.last_driver_action_at := coalesce(new.last_driver_action_at, new.accepted_at, new.created_at, now());
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status in (
      'DRIVER_ACCEPTED',
      'SCHEDULED_DRIVER_ACCEPTED',
      'SCHEDULED_DRIVER_REJECTED',
      'SCHEDULED_UPCOMING',
      'DRIVER_ARRIVING',
      'DRIVER_ARRIVED',
      'TRIP_STARTED',
      'TRIP_COMPLETED',
      'DRIVER_CANCELLED'
    ) then
      new.last_driver_action_at := now();
    end if;

    if new.status in ('CUSTOMER_CANCELLED') then
      new.last_customer_action_at := now();
    end if;

    if new.status <> old.status and new.status not in ('TRIP_STARTED') then
      new.requires_admin_review := false;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.touch_booking_action_timestamps() from public, anon, authenticated;

drop trigger if exists trg_touch_booking_action_timestamps on public.bookings;
create trigger trg_touch_booking_action_timestamps
before insert or update of status on public.bookings
for each row execute function app_private.touch_booking_action_timestamps();

create or replace function app_private.log_booking_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_type text := 'system';
  v_actor_id uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_events (booking_id, from_status, to_status, actor_type, actor_id, reason)
    values (new.id, null, new.status, 'customer', new.customer_id, 'booking_created');
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('CUSTOMER_CANCELLED') then
      v_actor_type := 'customer';
      v_actor_id := new.customer_id;
    elsif new.status in (
      'DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_REJECTED',
      'SCHEDULED_UPCOMING', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED',
      'TRIP_COMPLETED', 'DRIVER_CANCELLED'
    ) then
      v_actor_type := 'driver';
      v_actor_id := new.driver_id;
    elsif new.cancelled_by = 'SYSTEM' or new.status = 'EXPIRED' then
      v_actor_type := 'system';
    end if;

    insert into public.booking_status_events (
      booking_id,
      from_status,
      to_status,
      actor_type,
      actor_id,
      reason,
      metadata
    ) values (
      new.id,
      old.status,
      new.status,
      v_actor_type,
      v_actor_id,
      coalesce(new.cancel_reason, new.timeout_stage),
      jsonb_build_object(
        'timeout_stage', new.timeout_stage,
        'cancelled_by', new.cancelled_by,
        'requires_admin_review', new.requires_admin_review
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function app_private.log_booking_status_event() from public, anon, authenticated;

drop trigger if exists trg_log_booking_status_event on public.bookings;
create trigger trg_log_booking_status_event
after insert or update of status on public.bookings
for each row execute function app_private.log_booking_status_event();

create or replace function app_private.touch_booking_driver_location_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.bookings
  set last_driver_location_at = coalesce(new.updated_at, now()),
      updated_at = now()
  where id = new.booking_id
    and driver_id = new.driver_id
    and status in ('DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED');
  return new;
end;
$$;

revoke all on function app_private.touch_booking_driver_location_at() from public, anon, authenticated;

drop trigger if exists trg_touch_booking_driver_location_at on public.driver_locations;
create trigger trg_touch_booking_driver_location_at
after insert or update on public.driver_locations
for each row execute function app_private.touch_booking_driver_location_at();

create or replace function app_private.notify_booking_timeout_warning(
  p_booking public.bookings,
  p_title text,
  p_customer_content text,
  p_driver_content text,
  p_stage text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.bookings
  set timeout_warning_sent_at = now(),
      timeout_stage = p_stage,
      updated_at = now()
  where id = p_booking.id;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values
    (p_booking.customer_id, p_title, p_customer_content, 'booking_update', false, p_booking.id),
    (p_booking.driver_id, p_title, p_driver_content, 'booking_update', false, p_booking.id);

  insert into public.booking_status_events (booking_id, from_status, to_status, actor_type, reason, metadata)
  values (
    p_booking.id,
    p_booking.status,
    p_booking.status,
    'system',
    p_stage,
    jsonb_build_object('event', 'timeout_warning')
  );
end;
$$;

revoke all on function app_private.notify_booking_timeout_warning(public.bookings, text, text, text, text) from public, anon, authenticated;

create or replace function app_private.expire_abandoned_booking(
  p_booking public.bookings,
  p_stage text,
  p_reason text,
  p_severity text default 'medium'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.bookings
  set status = 'EXPIRED',
      cancelled_by = 'SYSTEM',
      cancelled_at = coalesce(cancelled_at, now()),
      cancel_reason = p_reason,
      timeout_stage = p_stage,
      requires_admin_review = false,
      updated_at = now()
  where id = p_booking.id
    and status = p_booking.status;

  if p_booking.driver_id is not null then
    insert into public.driver_reliability_events (driver_id, booking_id, event_type, severity, reason, metadata)
    values (
      p_booking.driver_id,
      p_booking.id,
      'abandoned_trip_timeout',
      p_severity,
      p_reason,
      jsonb_build_object('stage', p_stage, 'status', p_booking.status)
    );
  end if;

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values
    (p_booking.customer_id, 'Chuyến đã được hủy tự động', p_reason || ' Bạn có thể đặt lại chuyến mới.', 'booking_cancelled', false, p_booking.id),
    (p_booking.driver_id, 'Chuyến đã bị hủy do không hoạt động', p_reason, 'booking_cancelled', false, p_booking.id);
end;
$$;

revoke all on function app_private.expire_abandoned_booking(public.bookings, text, text, text) from public, anon, authenticated;

create or replace function app_private.mark_booking_completion_review(
  p_booking public.bookings,
  p_stage text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.bookings
  set requires_admin_review = true,
      timeout_warning_sent_at = coalesce(timeout_warning_sent_at, now()),
      timeout_stage = p_stage,
      updated_at = now()
  where id = p_booking.id
    and status = 'TRIP_STARTED'
    and coalesce(requires_admin_review, false) = false;

  insert into public.driver_reliability_events (driver_id, booking_id, event_type, severity, reason, metadata)
  values (
    p_booking.driver_id,
    p_booking.id,
    'completion_review_required',
    'medium',
    p_reason,
    jsonb_build_object('stage', p_stage, 'status', p_booking.status)
  );

  insert into public.booking_status_events (booking_id, from_status, to_status, actor_type, reason, metadata)
  values (
    p_booking.id,
    p_booking.status,
    p_booking.status,
    'system',
    p_stage,
    jsonb_build_object('event', 'completion_review_required')
  );

  insert into public.notifications (user_id, title, content, type, read, related_booking_id)
  values
    (p_booking.customer_id, 'Chuyến cần xác minh hoàn thành', 'Chuyến đã bắt đầu nhưng chưa được tài xế xác nhận hoàn thành trong thời gian dài. Daigo sẽ cần xác minh thêm nếu có tranh chấp.', 'booking_update', false, p_booking.id),
    (p_booking.driver_id, 'Vui lòng xác nhận hoàn thành chuyến', 'Chuyến đang đi đã kéo dài bất thường. Nếu đã trả khách, hãy mở chuyến và bấm hoàn thành.', 'booking_update', false, p_booking.id);
end;
$$;

revoke all on function app_private.mark_booking_completion_review(public.bookings, text, text) from public, anon, authenticated;

create or replace function app_private.process_abandoned_bookings()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_booking public.bookings%rowtype;
  v_now timestamptz := now();
  v_last_driver_activity timestamptz;
begin
  -- Không có tài xế nhận chuyến đi ngay.
  for v_booking in
    select * from public.bookings
    where status = 'SEARCHING_DRIVER'
      and booking_mode = 'instant'
      and created_at < v_now - interval '15 minutes'
  loop
    perform app_private.expire_abandoned_booking(
      v_booking,
      'no_driver_found_timeout',
      'Không tìm được tài xế phù hợp trong thời gian chờ.',
      'low'
    );
  end loop;

  -- Tài xế nhận chuyến nhưng không thao tác tiếp.
  for v_booking in
    select * from public.bookings
    where status in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
      and driver_id is not null
      and coalesce(last_driver_action_at, accepted_at, updated_at, created_at) < v_now - interval '10 minutes'
      and timeout_warning_sent_at is null
  loop
    perform app_private.notify_booking_timeout_warning(
      v_booking,
      'Tài xế chưa cập nhật chuyến',
      'Tài xế đã nhận chuyến nhưng chưa có thao tác tiếp theo. Bạn có thể theo dõi thêm hoặc hủy chuyến nếu cần.',
      'Bạn đã nhận chuyến nhưng chưa cập nhật trạng thái. Vui lòng mở chuyến và thao tác tiếp.',
      'driver_no_action_warning'
    );
  end loop;

  for v_booking in
    select * from public.bookings
    where status in ('DRIVER_ACCEPTED', 'SCHEDULED_DRIVER_ACCEPTED', 'SCHEDULED_UPCOMING')
      and driver_id is not null
      and coalesce(last_driver_action_at, accepted_at, updated_at, created_at) < v_now - interval '25 minutes'
  loop
    perform app_private.expire_abandoned_booking(
      v_booking,
      'driver_no_action_timeout',
      'Tài xế đã nhận chuyến nhưng không cập nhật trạng thái trong thời gian dài.',
      'medium'
    );
  end loop;

  -- Tài xế đang tới nhưng không có GPS/action mới.
  for v_booking in
    select * from public.bookings
    where status = 'DRIVER_ARRIVING'
      and driver_id is not null
  loop
    v_last_driver_activity := greatest(
      coalesce(v_booking.last_driver_location_at, '-infinity'::timestamptz),
      coalesce(v_booking.last_driver_action_at, '-infinity'::timestamptz),
      coalesce(v_booking.arriving_at, '-infinity'::timestamptz),
      coalesce(v_booking.updated_at, '-infinity'::timestamptz)
    );

    if v_last_driver_activity < v_now - interval '10 minutes'
       and v_booking.timeout_warning_sent_at is null then
      perform app_private.notify_booking_timeout_warning(
        v_booking,
        'Tài xế có thể không hoạt động',
        'Tài xế đang tới điểm đón nhưng hệ thống chưa nhận được cập nhật mới. Bạn có thể hủy không mất phí nếu tiếp tục chờ quá lâu.',
        'Bạn đang ở bước tới điểm đón nhưng chưa cập nhật GPS/trạng thái. Vui lòng mở app và tiếp tục chuyến.',
        'driver_arriving_inactive_warning'
      );
    end if;

    if v_last_driver_activity < v_now - interval '25 minutes' then
      perform app_private.expire_abandoned_booking(
        v_booking,
        'driver_arriving_inactive_timeout',
        'Tài xế không hoạt động khi đang tới điểm đón.',
        'high'
      );
    end if;
  end loop;

  -- Tài xế đã tới nhưng chuyến không bắt đầu quá lâu.
  for v_booking in
    select * from public.bookings
    where status = 'DRIVER_ARRIVED'
      and driver_id is not null
      and coalesce(last_driver_action_at, arrived_at, updated_at, created_at) < v_now - interval '20 minutes'
      and timeout_warning_sent_at is null
  loop
    perform app_private.notify_booking_timeout_warning(
      v_booking,
      'Chuyến chưa bắt đầu',
      'Tài xế đã báo đến điểm đón nhưng chuyến chưa được bắt đầu. Nếu có vấn đề, bạn có thể liên hệ tài xế hoặc hủy chuyến.',
      'Bạn đã báo đến điểm đón nhưng chưa bắt đầu chuyến. Vui lòng cập nhật trạng thái để tránh chuyến bị treo.',
      'driver_arrived_no_start_warning'
    );
  end loop;

  for v_booking in
    select * from public.bookings
    where status = 'DRIVER_ARRIVED'
      and driver_id is not null
      and coalesce(last_driver_action_at, arrived_at, updated_at, created_at) < v_now - interval '45 minutes'
  loop
    perform app_private.expire_abandoned_booking(
      v_booking,
      'driver_arrived_no_start_timeout',
      'Chuyến không được bắt đầu sau khi tài xế báo đã đến điểm đón.',
      'medium'
    );
  end loop;

  -- Chuyến đã bắt đầu nhưng không hoàn thành bất thường: không tự hủy, đưa vào review.
  for v_booking in
    select * from public.bookings
    where status = 'TRIP_STARTED'
      and driver_id is not null
      and coalesce(requires_admin_review, false) = false
      and coalesce(last_driver_action_at, started_at, updated_at, created_at) < v_now - interval '90 minutes'
  loop
    perform app_private.mark_booking_completion_review(
      v_booking,
      'completion_review_required',
      'Chuyến đã bắt đầu nhưng chưa được xác nhận hoàn thành trong thời gian dài.'
    );
  end loop;
end;
$$;

revoke all on function app_private.process_abandoned_bookings() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daigo_process_abandoned_bookings') then
    perform cron.unschedule('daigo_process_abandoned_bookings');
  end if;
  perform cron.schedule(
    'daigo_process_abandoned_bookings',
    '*/5 * * * *',
    'select app_private.process_abandoned_bookings();'
  );
exception
  when undefined_table or undefined_function then null;
end $$;
