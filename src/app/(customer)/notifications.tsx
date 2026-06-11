import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { AuthRequired } from '@/components/AuthRequired';
import { Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_NOTIFICATIONS } from '@/services/mockData';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để xem thông báo cá nhân." />;
  }

  return (
    <Screen scroll padding>
      {MOCK_NOTIFICATIONS.map((notification) => (
        <TouchableOpacity
          key={notification.id}
          activeOpacity={0.84}
          onPress={() =>
            router.push({
              pathname: '/(customer)/notification-detail' as any,
              params: { id: notification.id },
            })
          }
        >
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
                {notification.read ? (
                  <CheckCircle2 size={22} color={colors.textSecondary} />
                ) : (
                  <Bell size={22} color="white" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                  {notification.title}
                </Text>
                <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
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
    </Screen>
  );
}
