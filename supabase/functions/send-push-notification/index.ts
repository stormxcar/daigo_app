import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PREFIXES = ['ExponentPushToken[', 'ExpoPushToken['];

type PushRequestBody = {
  user_id?: string;
  userId?: string;
  user_ids?: string[];
  userIds?: string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  record?: {
    user_id?: string;
    title?: string;
    content?: string;
    type?: string;
    id?: string;
    related_booking_id?: string | null;
    related_post_id?: string | null;
  };
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isExpoPushToken(token: string) {
  return EXPO_TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix));
}

serve(async (req: Request) => {
  try {
    const body = (await req.json()) as PushRequestBody;
    const record = body.record;
    const targetUserIds = unique([
      ...(body.user_ids ?? []),
      ...(body.userIds ?? []),
      body.user_id ?? '',
      body.userId ?? '',
      record?.user_id ?? '',
    ]);
    const title = body.title ?? record?.title ?? 'Thông báo Daigo';
    const message = body.body ?? record?.content ?? '';
    const payload = {
      notificationId: record?.id,
      type: record?.type,
      relatedBookingId: record?.related_booking_id,
      relatedPostId: record?.related_post_id,
      ...(body.data ?? {}),
    };

    if (targetUserIds.length === 0 || !title) {
      return new Response(JSON.stringify({ error: 'Missing user_id/userId/user_ids/userIds or title' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get all active push tokens for this user
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', targetUserIds)
      .eq('enabled', true);

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200 });
    }

    // Build Expo push messages
    const isIncomingCall =
      payload.type === 'incoming_call' ||
      String(title).toLowerCase().includes('cuộc gọi') ||
      String(message).toLowerCase().includes('đang gọi cho bạn');
    const channelId = isIncomingCall ? 'calls' : 'default';
    const messages = tokens
      .map((t) => t.token)
      .filter(isExpoPushToken)
      .map((token) => ({
        to: token,
        title,
        body: message || '',
        data: {
          ...payload,
          notificationKind: isIncomingCall ? 'incoming_call' : payload.type ?? 'system',
        },
        sound: 'default',
        priority: 'high',
        channelId,
      }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_expo_tokens' }), { status: 200 });
    }

    // Send to Expo Push API
    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();
    if (!pushResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'expo_push_failed', status: pushResponse.status, result: pushResult }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ sent: messages.length, result: pushResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
