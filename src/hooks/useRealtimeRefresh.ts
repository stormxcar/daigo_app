import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/services/supabase';

type RealtimeTarget = {
  table: string;
  filter?: string;
};

type UseRealtimeRefreshOptions = {
  channelKey: string;
  targets: RealtimeTarget[];
  enabled?: boolean;
  refreshOnFocus?: boolean;
  debounceMs?: number;
  onRefresh: () => void | Promise<void>;
};

export function useRealtimeRefresh({
  channelKey,
  targets,
  enabled = true,
  refreshOnFocus = true,
  debounceMs = 450,
  onRefresh,
}: UseRealtimeRefreshOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);
  const targetsKey = useMemo(() => JSON.stringify(targets), [targets]);
  const stableTargets = useMemo(() => targets, [targetsKey]);

  const refresh = useCallback(() => {
    if (!enabled || refreshingRef.current) return;
    refreshingRef.current = true;
    Promise.resolve(onRefresh())
      .catch((error) => {
        if (__DEV__) console.warn('[DAIGO_REALTIME_REFRESH_ERROR]', { channelKey, error });
      })
      .finally(() => {
        refreshingRef.current = false;
      });
  }, [channelKey, enabled, onRefresh]);

  const scheduleRefresh = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(refresh, debounceMs);
  }, [debounceMs, enabled, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (enabled && refreshOnFocus) refresh();
    }, [enabled, refresh, refreshOnFocus])
  );

  useEffect(() => {
    if (!enabled || stableTargets.length === 0) return undefined;

    const channel = supabase.channel(`realtime-refresh-${channelKey}`);
    stableTargets.forEach((target) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: target.table,
          ...(target.filter ? { filter: target.filter } : {}),
        },
        scheduleRefresh,
      );
    });
    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelKey, enabled, scheduleRefresh, stableTargets, targetsKey]);
}