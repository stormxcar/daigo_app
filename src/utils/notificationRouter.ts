import { NotificationItem, UserRole } from '@/types';

type NotificationLike = Partial<NotificationItem> & Record<string, any>;

export type NotificationTarget = {
  pathname: string;
  params?: Record<string, string>;
};

const getValue = (data: NotificationLike, camelKey: string, snakeKey: string) =>
  data?.[camelKey] ?? data?.[snakeKey] ?? data?.data?.[camelKey] ?? data?.data?.[snakeKey];

export function normalizeNotificationPayload(data: NotificationLike) {
  const type = String(data?.type ?? data?.notificationKind ?? data?.data?.type ?? data?.data?.notificationKind ?? 'system');

  return {
    id: getValue(data, 'notificationId', 'notification_id') ?? data?.id,
    type,
    relatedBookingId: getValue(data, 'relatedBookingId', 'related_booking_id'),
    relatedPostId: getValue(data, 'relatedPostId', 'related_post_id'),
    conversationId: getValue(data, 'conversationId', 'conversation_id'),
    callSessionId: getValue(data, 'callSessionId', 'call_session_id') ?? getValue(data, 'callId', 'call_id'),
  };
}

export function resolveNotificationTarget(
  data: NotificationLike,
  role: UserRole = 'customer',
): NotificationTarget {
  const payload = normalizeNotificationPayload(data);
  const roleGroup = role === 'driver' ? 'driver' : 'customer';

  if (payload.type === 'incoming_call' && payload.callSessionId) {
    return { pathname: '/call', params: { callId: String(payload.callSessionId), mode: 'receiver' } };
  }

  if ((payload.type === 'chat_message' || payload.type === 'system') && payload.conversationId) {
    return {
      pathname: `/(${roleGroup})/chat-detail`,
      params: { id: String(payload.conversationId) },
    };
  }

  if (
    payload.relatedBookingId &&
    ['payment_update', 'payment_submitted', 'payment_verified'].includes(payload.type)
  ) {
    if (roleGroup === 'driver') {
      return { pathname: '/(driver)/payment-review', params: { bookingId: String(payload.relatedBookingId) } };
    }
    return { pathname: '/(customer)/payment', params: { bookingId: String(payload.relatedBookingId) } };
  }

  if (payload.relatedBookingId) {
    return {
      pathname: `/(${roleGroup})/booking-detail`,
      params: { id: String(payload.relatedBookingId) },
    };
  }

  if (payload.relatedPostId) {
    return {
      pathname: `/(${roleGroup})/blog-detail`,
      params: { id: String(payload.relatedPostId) },
    };
  }

  return { pathname: `/(${roleGroup})/notifications` };
}
