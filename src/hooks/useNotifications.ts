import { useNotificationStore } from '@/stores/notificationStore';
import { useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';

export const useNotifications = (userId?: string) => {
  const store = useNotificationStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      store.clearNotifications();
      store.setLoading(false);
      return;
    }
    try {
      store.setLoading(true);
      const notifications = await apiClient.getNotifications(userId);
      store.setNotifications(notifications);
      store.setLoading(false);
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      store.markAsRead(notificationId);
    } catch (err: any) {
      store.setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!userId) {
      store.clearNotifications();
      store.setLoading(false);
      return;
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [userId, fetchNotifications]);

  return {
    ...store,
    fetchNotifications,
    markAsRead,
  };
};
