import { useEffect, useRef } from 'react';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function AppNotificationBridge() {
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!isAuthenticated || !userId) {
      clearNotifications();
      return;
    }

    let active = true;
    const fetchNotifications = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const [pageData, unreadTotal] = await Promise.all([
          apiClient.getNotificationsPage(userId, 1, 20),
          apiClient.getUnreadNotificationCount(userId),
        ]);
        if (active) {
          setNotifications(pageData.items);
          setUnreadCount(unreadTotal);
        }
      } catch (error) {
        if (__DEV__) console.warn('[DAIGO_NOTIFICATION_BRIDGE_ERROR]', error);
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel(`app-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        fetchNotifications
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [clearNotifications, isAuthenticated, setNotifications, setUnreadCount, userId]);

  return null;
}
