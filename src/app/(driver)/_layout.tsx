import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import {
  BarChart3,
  Car,
  Briefcase,
  UserCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { AuthRequired } from '@/components/AuthRequired';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/stores/authStore';

export default function DriverLayout() {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'driver') {
      router.replace('/(customer)/home');
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated) {
    return (
      <AuthRequired description="Bạn cần đăng nhập bằng tài khoản tài xế để vào khu vực này." />
    );
  }

  if (user?.role !== 'driver') {
    return (
      <AuthRequired
        title="Không có quyền truy cập"
        description="Khu vực này chỉ dành cho tài xế."
        actionLabel="Về trang chủ"
        onActionPress={() => router.replace('/(customer)/home')}
      />
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: ({ options }: { options: { title?: string } }) => (
          <AppHeader title={options.title} showNotifications={false} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Bảng điều khiển',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Xe',
          tabBarIcon: ({ color, size }) => (
            <Car color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Chuyến đi',
          tabBarIcon: ({ color, size }) => (
            <Briefcase color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <UserCircle color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
