import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Card, Avatar, Button } from '@/components/BaseComponents';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, ChevronRight } from 'lucide-react-native';

export default function DriverProfile() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/(customer)/home');
  };

  return (
    <Screen scroll padding>
      {/* Driver Info Card */}
      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <Avatar
          initials={user?.fullName
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase() || 'TX'}
          size="lg"
          style={{ marginBottom: spacing.lg }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing.xs,
          }}
        >
          {user?.fullName}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
          {user?.email}
        </Text>
        <Button label="Chỉnh sửa hồ sơ" onPress={() => {}} size="sm" />
      </Card>

      {/* Menu Items */}
      <View style={{ marginBottom: spacing.lg }}>
        {[
          { label: 'Thống kê', icon: '📊' },
          { label: 'Thu nhập', icon: '💰' },
          { label: 'Cài đặt', icon: '⚙️' },
          { label: 'Về ứng dụng', icon: 'ℹ️' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                {item.label}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <Button
        label="Đăng xuất"
        onPress={handleLogout}
        variant="danger"
        icon={<LogOut size={20} color="white" />}
      />
    </Screen>
  );
}
