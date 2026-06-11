import { useNotificationStore } from '@/stores/notificationStore';
import { useCallback, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';

export const useNotifications = (userId?: string) => {
  const store = useNotificationStore();

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
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
    if (!userId) return;

    const channelName = `notifications-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  return {
    ...store,
    fetchNotifications,
    markAsRead,
  };
};
