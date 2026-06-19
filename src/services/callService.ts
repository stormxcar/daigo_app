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
  bookingId?: string;
}) {
  try {
    await supabase.from('notifications').insert({
      user_id: data.userId,
      title: 'Cuộc gọi đến',
      content: `${data.callerName} đang gọi cho bạn trong ứng dụng.`,
      type: 'system',
      read: false,
      related_booking_id: data.bookingId,
    });
  } catch {
    // Realtime call still works even if auxiliary notification insert is denied.
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
    if (error) throw error;

    await createCallNotification({
      userId: data.receiverId,
      callerName: data.callerName,
      callSessionId: inserted.id,
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

  async updateCallStatus(id: string, status: CallStatus, startedAt?: string): Promise<CallSession> {
    const endedAt = ['ended', 'rejected', 'missed', 'failed'].includes(status) ? new Date().toISOString() : undefined;
    const acceptedAt = status === 'accepted' ? new Date().toISOString() : undefined;
    const durationSeconds =
      status === 'ended' && startedAt ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)) : undefined;

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
    return mapCallSession(data as CallSessionRow);
  }

  subscribeIncomingCalls(userId: string, onIncoming: (call: CallSession) => void) {
    const channel = supabase
      .channel(`incoming-calls-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          const call = mapCallSession(payload.new as CallSessionRow);
          if (call.callType === 'agora' && call.status === 'ringing') onIncoming(call);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeCallSession(callId: string, onChange: (call: CallSession) => void) {
    const channel = supabase
      .channel(`call-session-${callId}`)
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
