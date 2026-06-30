import { CallSession, CallStatus, CallType } from '@/types';
import { supabase } from './supabase';

type CallSessionRow = {
  id: string;
  booking_id: string | null;
  chat_id: string | null;
  caller_id: string;
  receiver_id: string;
  call_type: CallType;
  agora_channel: string | null;
  status: CallStatus;
  started_at: string | null;
  accepted_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
};

const INCOMING_CALL_RING_TIMEOUT_MS = 45_000;

const isFreshRingingCall = (call: Pick<CallSession, 'createdAt' | 'status'>) => {
  if (call.status !== 'ringing') return false;
  const createdAt = new Date(call.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= INCOMING_CALL_RING_TIMEOUT_MS;
};

const mapCallSession = (row: CallSessionRow): CallSession => ({
  id: row.id,
  bookingId: row.booking_id ?? undefined,
  chatId: row.chat_id ?? undefined,
  callerId: row.caller_id,
  receiverId: row.receiver_id,
  callType: row.call_type,
  agoraChannel: row.agora_channel ?? undefined,
  status: row.status,
  startedAt: row.started_at ?? undefined,
  acceptedAt: row.accepted_at ?? undefined,
  endedAt: row.ended_at ?? undefined,
  durationSeconds: row.duration_seconds ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

async function createCallNotification(data: {
  userId: string;
  callerName: string;
  callSessionId: string;
  chatId?: string;
  bookingId?: string;
}) {
  try {
    await supabase.from('notifications').insert({
      user_id: data.userId,
      title: 'Cuộc gọi đến',
      content: `${data.callerName} đang gọi cho bạn trong ứng dụng.`,
      type: 'incoming_call',
      read: false,
      related_booking_id: data.bookingId ?? null,
      conversation_id: data.chatId ?? null,
      call_session_id: data.callSessionId,
    });
  } catch {
    // Realtime call still works even if auxiliary notification insert is denied.
  }

  // Push is sent by the notifications INSERT trigger. In-app realtime remains the primary signaling path.
}

async function createCallChatMessage(call: CallSessionRow, status: CallStatus) {
  if (!call.chat_id) return;
  const durationSeconds = call.duration_seconds ?? 0;
  const durationText = durationSeconds > 0
    ? ` · ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
    : '';
  const text =
    status === 'ended'
      ? `Cuộc gọi thoại đã kết thúc${durationText}`
      : status === 'rejected'
      ? 'Cuộc gọi đã bị từ chối'
      : status === 'failed'
        ? 'Cuộc gọi không thành công'
        : 'Cuộc gọi nhỡ';

  try {
    await supabase
      .from('messages')
      .upsert(
        {
          conversation_id: call.chat_id,
          sender_id: call.caller_id,
          text,
          message_kind: 'call',
          call_session_id: call.id,
          call_status: status,
          call_duration_seconds: status === 'ended' ? durationSeconds : null,
        },
        { onConflict: 'call_session_id' }
      );
  } catch {
    // Call state should not fail just because the auxiliary chat log cannot be written.
  }
}

class CallService {
  async createAgoraCall(data: {
    callerId: string;
    receiverId: string;
    callerName: string;
    chatId?: string;
    bookingId?: string;
  }): Promise<CallSession> {
    const { data: activeCalls, error: activeError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('call_type', 'agora')
      .in('status', ['ringing', 'accepted'])
      .or(
        `and(caller_id.eq.${data.callerId},receiver_id.eq.${data.receiverId}),and(caller_id.eq.${data.receiverId},receiver_id.eq.${data.callerId})`
      )
      .order('created_at', { ascending: false })
      .limit(10);
    if (activeError) throw activeError;

    const activeCall = (activeCalls as CallSessionRow[] | null)?.find((call) => {
      if (data.chatId) return call.chat_id === data.chatId;
      if (data.bookingId) return call.booking_id === data.bookingId;
      return !call.chat_id && !call.booking_id;
    });
    if (activeCall) {
      throw new Error('Đang có một cuộc gọi chưa kết thúc giữa hai người dùng này.');
    }

    const channel = `daigo_${data.chatId ?? data.bookingId ?? Date.now()}`.replace(/[^A-Za-z0-9_]/g, '_');
    const { data: inserted, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: data.callerId,
        receiver_id: data.receiverId,
        chat_id: data.chatId,
        booking_id: data.bookingId,
        call_type: 'agora',
        agora_channel: channel,
        status: 'ringing',
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === 'P0001') {
        throw new Error(error.message || 'Đang có một cuộc gọi chưa kết thúc giữa hai người dùng này.');
      }
      throw error;
    }

    await createCallNotification({
      userId: data.receiverId,
      callerName: data.callerName,
      callSessionId: inserted.id,
      chatId: data.chatId,
      bookingId: data.bookingId,
    });

    return mapCallSession(inserted as CallSessionRow);
  }

  async createPhoneCallLog(data: {
    callerId: string;
    receiverId: string;
    chatId?: string;
    bookingId?: string;
  }): Promise<CallSession> {
    const { data: inserted, error } = await supabase
      .from('call_sessions')
      .insert({
        caller_id: data.callerId,
        receiver_id: data.receiverId,
        chat_id: data.chatId,
        booking_id: data.bookingId,
        call_type: 'phone',
        status: 'ringing',
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return this.updateCallStatus(inserted.id, 'ended', inserted.started_at);
  }

  async getCallSession(id: string): Promise<CallSession> {
    const { data, error } = await supabase.from('call_sessions').select('*').eq('id', id).single();
    if (error) throw error;
    return mapCallSession(data as CallSessionRow);
  }

  async getActiveIncomingCall(userId: string): Promise<CallSession | null> {
    const staleBefore = new Date(Date.now() - INCOMING_CALL_RING_TIMEOUT_MS).toISOString();
    const { data: staleCalls } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('receiver_id', userId)
      .eq('call_type', 'agora')
      .eq('status', 'ringing')
      .lt('created_at', staleBefore)
      .order('created_at', { ascending: false })
      .limit(5);

    if (staleCalls?.length) {
      await Promise.all(
        (staleCalls as CallSessionRow[]).map((call) =>
          this.updateCallStatus(call.id, 'missed', call.started_at ?? call.created_at).catch(() => undefined)
        )
      );
    }

    const { data, error } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('receiver_id', userId)
      .eq('call_type', 'agora')
      .eq('status', 'ringing')
      .gte('created_at', staleBefore)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const call = data ? mapCallSession(data as CallSessionRow) : null;
    return call && isFreshRingingCall(call) ? call : null;
  }

  async updateCallStatus(id: string, status: CallStatus, startedAt?: string): Promise<CallSession> {
    const { data: existing } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    const existingRow = existing as CallSessionRow | null;
    const shouldEndAsCompleted =
      status === 'ended' &&
      (existingRow?.status === 'accepted' || !!existingRow?.accepted_at);
    const endedAt = ['ended', 'rejected', 'missed', 'failed'].includes(status) ? new Date().toISOString() : undefined;
    const acceptedAt = status === 'accepted' ? new Date().toISOString() : existingRow?.accepted_at ?? undefined;
    const durationSeconds =
      status === 'ended' && (startedAt || existingRow?.started_at || existingRow?.accepted_at)
        ? Math.max(0, Math.round((Date.now() - new Date(startedAt ?? existingRow?.accepted_at ?? existingRow!.started_at!).getTime()) / 1000))
        : undefined;

    const { data, error } = await supabase
      .from('call_sessions')
      .update({
        status,
        accepted_at: acceptedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const row = data as CallSessionRow;
    const isUnansweredEnd = status === 'ended' && !shouldEndAsCompleted && !row.accepted_at;
    if (['ended', 'rejected', 'missed', 'failed'].includes(status) || isUnansweredEnd) {
      await createCallChatMessage(row, isUnansweredEnd ? 'missed' : status);
    }

    return mapCallSession(data as CallSessionRow);
  }

  subscribeIncomingCalls(userId: string, onIncoming: (call: CallSession | null) => void) {
    const instanceId = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`incoming-calls-${userId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'call_sessions', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as CallSessionRow | undefined;
          if (!next) return;
          const call = mapCallSession(next);
          if (call.callType === 'agora' && isFreshRingingCall(call)) {
            onIncoming(call);
          } else {
            onIncoming(null);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeCallSession(callId: string, onChange: (call: CallSession) => void) {
    const instanceId = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`call-session-${callId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `id=eq.${callId}` },
        (payload) => onChange(mapCallSession(payload.new as CallSessionRow))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const callService = new CallService();
