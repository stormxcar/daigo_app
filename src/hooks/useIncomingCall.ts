import { useEffect, useState } from 'react';
import { CallSession, User } from '@/types';
import { callService } from '@/services/callService';

export function useIncomingCall(user: User | null) {
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    return callService.subscribeIncomingCalls(user.id, setIncomingCall);
  }, [user?.id]);

  return {
    incomingCall,
    clearIncomingCall: () => setIncomingCall(null),
  };
}
