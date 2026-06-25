-- Migration: Tích hợp Supabase Edge Function gửi Expo Push Notification
-- Khi DB trigger insert vào notifications table, pg_net gọi edge function để gửi push thật.
--
-- ĐÒI HỎI: pg_net extension đã được enable trên Supabase project.
-- Kiểm tra: SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Bước 1: Đảm bảo pg_net extension đã được enable
create extension if not exists pg_net with schema extensions;

-- Bước 2: Hàm helper gọi edge function send-push-notification
create or replace function app_private.call_send_push_notification(
  p_user_id  uuid,
  p_title    text,
  p_body     text,
  p_data     jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url  text;
begin
  v_project_url := current_setting('app.supabase_url', true);

  -- Nếu chưa set config, dùng project URL thật.
  if v_project_url is null or v_project_url = '' then
    v_project_url := 'https://slejvkhtyvwfthgdrzdp.supabase.co';
  end if;

  perform net.http_post(
    url     := v_project_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'user_id', p_user_id::text,
      'title',   p_title,
      'body',    p_body,
      'data',    p_data
    )
  );
exception when others then
  -- Push notification failure must never roll back the main transaction
  null;
end;
$$;

-- Bước 3: Trigger function — gửi push khi có notification mới insert vào bảng
create or replace function app_private.send_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Chỉ gửi push với thông báo chưa đọc (read = false)
  if new.read = false then
    perform app_private.call_send_push_notification(
      new.user_id,
      coalesce(new.title, 'Thông báo Daigo'),
      coalesce(new.content, ''),
      jsonb_build_object(
        'notification_id', new.id,
        'type', coalesce(new.type, 'system'),
        'related_booking_id', new.related_booking_id,
        'related_post_id', new.related_post_id
      )
    );
  end if;
  return new;
end;
$$;

-- Bước 4: Đặt trigger trên bảng notifications
drop trigger if exists trg_send_push_on_notification_insert on public.notifications;

create trigger trg_send_push_on_notification_insert
  after insert on public.notifications
  for each row
  execute function app_private.send_push_on_notification_insert();

-- Bước 5: Có thể set Supabase URL làm PostgreSQL config nếu đổi project
-- Thay thế giá trị dưới đây bằng URL thật của project
-- (Làm 1 lần từ Supabase SQL Editor với quyền superuser)
--
-- alter database postgres set app.supabase_url = 'https://slejvkhtyvwfthgdrzdp.supabase.co';
