import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { CallSession, User } from '@/types';
import { callService } from '@/services/callService';

export function useIncomingCall(user: User | null) {
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);

  const refreshIncomingCall = useCallback(async () => {
    if (!user) {
      setIncomingCall(null);
      return;
    }

    try {
      const activeCall = await callService.getActiveIncomingCall(user.id);
      setIncomingCall(activeCall);
    } catch {
      // Incoming call prompt is best-effort; realtime will still update when available.
    }
  }, [user]);

  useEffect(() => {
    refreshIncomingCall();
  }, [refreshIncomingCall]);

  useEffect(() => {
    if (!user) return undefined;
    return callService.subscribeIncomingCalls(user.id, setIncomingCall);
  }, [user]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIncomingCall();
      }
    });
    return () => subscription.remove();
  }, [refreshIncomingCall]);

  return {
    incomingCall,
    clearIncomingCall: () => setIncomingCall(null),
  };
}
