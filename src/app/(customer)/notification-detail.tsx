import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Bell, CalendarClock, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Booking, NotificationItem } from '@/types';

export default function NotificationDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;
    apiClient.getNotifications(user.id).then(async (items) => {
      const found = items.find((item) => item.id === id) ?? null;
      setNotification(found);
      if (found?.relatedBookingId) {
        const related = await apiClient.getBookingById(found.relatedBookingId);
        setBooking(related);
      }
    }).catch(() => setNotification(null));
  }, [id, user?.id]);

  if (!notification) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Không tìm thấy thông báo.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card style={{ marginBottom: spacing.lg }}>
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
      </Card>

      {booking && (
        <Card style={{ marginBottom: spacing.lg }}>
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
        </Card>
      )}

      <Button label="Quay lại thông báo" onPress={() => router.back()} />
    </Screen>
  );
}
