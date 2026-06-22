import { useNotificationStore } from '@/stores/notificationStore';
import { useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';

export const useNotifications = (userId?: string) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const error = useNotificationStore((state) => state.error);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markNotificationAsRead = useNotificationStore((state) => state.markAsRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const setLoading = useNotificationStore((state) => state.setLoading);
  const setError = useNotificationStore((state) => state.setError);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      clearNotifications();
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const notifications = await apiClient.getNotifications(userId);
      setNotifications(notifications);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [clearNotifications, setError, setLoading, setNotifications, userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      markNotificationAsRead(notificationId);
    } catch (err: any) {
      setError(err.message);
    }
  }, [markNotificationAsRead, setError]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!userId) {
      clearNotifications();
      setLoading(false);
      return;
    }

    let active = true;
    const channel = supabase
      .channel(`notifications-${userId}-${instanceIdRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          if (active) fetchNotifications();
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [clearNotifications, fetchNotifications, setLoading, userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
  };
};
