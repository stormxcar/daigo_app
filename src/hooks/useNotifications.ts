import { useNotificationStore } from '@/stores/notificationStore';
import { useCallback } from 'react';
import { apiClient } from '@/services/api';

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

  return {
    ...store,
    fetchNotifications,
    markAsRead,
  };
};
