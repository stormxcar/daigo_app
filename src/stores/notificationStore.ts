import { create } from 'zustand';
import { NotificationItem } from '@/types';

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNotifications: (notifications: NotificationItem[]) => void;
  appendNotifications: (notifications: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markManyAsRead: (ids: string[]) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  getUnreadNotifications: () => NotificationItem[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  appendNotifications: (notifications) => {
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const merged = [
        ...state.notifications,
        ...notifications.filter((notification) => !existingIds.has(notification.id)),
      ];
      return { notifications: merged };
    });
  },

  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markAsRead: (id) => {
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: target && !target.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },

  markManyAsRead: (ids) => {
    const idSet = new Set(ids);
    set((state) => {
      const newlyReadCount = state.notifications.filter((n) => idSet.has(n.id) && !n.read).length;
      return {
        notifications: state.notifications.map((n) =>
          idSet.has(n.id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - newlyReadCount),
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read: true,
      })),
      unreadCount: 0,
    }));
  },

  deleteNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0, error: null, isLoading: false }),

  getUnreadNotifications: () => {
    return get().notifications.filter((n) => !n.read);
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
