import { useNotificationStore } from '@/stores/notificationStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';

const NOTIFICATION_PAGE_SIZE = 20;

export const useNotifications = (userId?: string) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const error = useNotificationStore((state) => state.error);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const appendNotifications = useNotificationStore((state) => state.appendNotifications);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const markNotificationAsRead = useNotificationStore((state) => state.markAsRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const setLoading = useNotificationStore((state) => state.setLoading);
  const setError = useNotificationStore((state) => state.setError);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const debugNotifications = process.env.EXPO_PUBLIC_ENV !== 'production';

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      clearNotifications();
      setLoading(false);
      setHasMore(false);
      return;
    }
    try {
      setLoading(true);
      const [pageData, unreadTotal] = await Promise.all([
        apiClient.getNotificationsPage(userId, 1, NOTIFICATION_PAGE_SIZE),
        apiClient.getUnreadNotificationCount(userId),
      ]);
      if (debugNotifications) {
        console.warn('[DAIGO_NOTIFICATIONS_FETCH]', {
          userId,
          count: pageData.items.length,
          total: pageData.total,
          unreadTotal,
        });
      }
      pageRef.current = 1;
      setNotifications(pageData.items);
      setUnreadCount(unreadTotal);
      setHasMore(pageData.hasMore);
      setLoading(false);
    } catch (err: any) {
      if (debugNotifications) {
        console.warn('[DAIGO_NOTIFICATIONS_ERROR]', {
          userId,
          message: err?.message,
          code: err?.code,
          details: err?.details,
        });
      }
      setError(err.message);
      setLoading(false);
    }
  }, [clearNotifications, debugNotifications, setError, setLoading, setNotifications, setUnreadCount, userId]);

  const loadMoreNotifications = useCallback(async () => {
    if (!userId || isLoading || isLoadingMore || !hasMore) return;
    try {
      setIsLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const pageData = await apiClient.getNotificationsPage(userId, nextPage, NOTIFICATION_PAGE_SIZE);
      appendNotifications(pageData.items);
      pageRef.current = nextPage;
      setHasMore(pageData.hasMore);
    } catch (err: any) {
      if (debugNotifications) {
        console.warn('[DAIGO_NOTIFICATIONS_LOAD_MORE_ERROR]', {
          userId,
          message: err?.message,
          code: err?.code,
          details: err?.details,
        });
      }
      setError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [appendNotifications, debugNotifications, hasMore, isLoading, isLoadingMore, setError, userId]);

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
      setHasMore(false);
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
      .subscribe((status, error) => {
        if (debugNotifications) {
          console.warn('[DAIGO_NOTIFICATIONS_SUBSCRIPTION]', {
            userId,
            status,
            error: error?.message,
          });
        }
      });
    channelRef.current = channel;

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [clearNotifications, debugNotifications, fetchNotifications, setLoading, userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    fetchNotifications,
    loadMoreNotifications,
    markAsRead,
  };
};
