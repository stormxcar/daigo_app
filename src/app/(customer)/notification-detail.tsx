import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Bell, CalendarClock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Booking, NotificationItem } from '@/types';
import { useNotificationStore } from '@/stores/notificationStore';

function NotificationSection({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      {children}
    </View>
  );
}

const isCallNotification = (notification: NotificationItem) =>
  notification.title?.toLowerCase().includes('cuộc gọi') ||
  notification.content?.toLowerCase().includes('đang gọi cho bạn');

export default function NotificationDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;
    apiClient.getNotifications(user.id).then(async (items) => {
      const found = items.find((item) => item.id === id) ?? null;
      setNotification(found);
      if (found && !found.read) {
        markAsRead(found.id);
        apiClient.markNotificationAsRead(found.id).catch(() => undefined);
      }
      if (found?.relatedBookingId && !isCallNotification(found)) {
        const related = await apiClient.getBookingById(found.relatedBookingId);
        setBooking(related);
      }
    }).catch(() => setNotification(null));
  }, [id, markAsRead, user?.id]);

  if (!notification) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Không tìm thấy thông báo.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <NotificationSection>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: borderRadius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Bell size={26} color="white" />
        </View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
          {notification.title}
        </Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }}>
          {notification.content}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm }}>
          {new Date(notification.createdAt).toLocaleString('vi-VN')}
        </Text>
      </NotificationSection>

      {booking && (
        <NotificationSection>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <CalendarClock size={22} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              Chuyến đi liên quan
            </Text>
          </View>
          {[
            ['Mã chuyến', booking.bookingCode ?? 'Chuyến đi'],
            ['Tuyến', `${booking.pickupLocation} → ${booking.dropoffLocation}`],
            ['Thời gian', `${booking.time} - ${booking.date}`],
            ['Tài xế', booking.driverName],
            ['Giá', `${booking.estimatedPrice.toLocaleString('vi-VN')} VND`],
          ].map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
              <ChevronRight size={16} color={colors.primary} />
              <Text style={{ color: colors.textSecondary, flex: 1 }}>
                {label}: <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
              </Text>
            </View>
          ))}
        </NotificationSection>
      )}

      <View style={{ padding: spacing.lg }}>
        <Button label="Quay lại thông báo" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
