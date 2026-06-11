import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';

export default function DriverNotifications() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, isLoading } = useNotifications(user?.id);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <Screen scroll padding refreshing={isLoading} onRefresh={fetchNotifications}>
      {isLoading ? (
        <>
          <CardSkeleton style={{ marginBottom: spacing.md }} />
          <CardSkeleton style={{ marginBottom: spacing.md }} />
        </>
      ) : notifications.slice(0, visibleCount).map((notification) => (
        <TouchableOpacity key={notification.id} activeOpacity={0.84} onPress={() => markAsRead(notification.id)}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: borderRadius.full,
                  backgroundColor: notification.read ? colors.surfaceAlt : colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notification.read ? <CheckCircle2 size={22} color={colors.textSecondary} /> : <Bell size={22} color="white" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{notification.title}</Text>
                <Text numberOfLines={3} style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                  {notification.content}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.sm }}>
                  {notification.time}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={<Bell size={48} color={colors.primary} />}
          title="Chưa có thông báo"
          description="Thông báo đặt xe, chat và hệ thống sẽ hiển thị tại đây."
        />
      )}
      {!isLoading && notifications.length > visibleCount && (
        <Button
          label="Tải thêm thông báo"
          onPress={() => setVisibleCount((current) => current + 12)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
