import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import {
  BarChart3,
  Car,
  Briefcase,
  UserCircle,
  MessageCircle,
  Newspaper,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { AuthRequired } from '@/components/AuthRequired';
import { AppHeader } from '@/components/AppHeader';
import { LiquidTabBar } from '@/components/LiquidTabBar';
import { useAuthStore } from '@/stores/authStore';

export default function DriverLayout() {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const detailRoutes = ['notifications', 'chat-detail', 'booking-detail', 'blog-detail'];
  const backHrefByRoute: Record<string, string> = {
    notifications: '/(driver)/dashboard',
    'chat-detail': '/(driver)/chat',
    'booking-detail': '/(driver)/bookings',
    'blog-detail': '/(driver)/blog',
  };

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
        header: ({ options, route }: { options: { title?: string }; route: { name: string } }) => (
          <AppHeader
            title={options.title}
            showBack={detailRoutes.includes(route.name)}
            showNotifications={!detailRoutes.includes(route.name)}
            notificationsHref="/(driver)/notifications"
            backHref={backHrefByRoute[route.name]}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
      tabBar={(props: any) => <LiquidTabBar {...props} />}
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
          href: null,
          title: 'Xe',
          tabBarIcon: ({ color, size }) => (
            <Car color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: 'Tin tức',
          tabBarIcon: ({ color, size }) => (
            <Newspaper color={color} size={size} />
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
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size} />
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
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Thông báo',
        }}
      />
      <Tabs.Screen
        name="chat-detail"
        options={{
          href: null,
          title: 'Tin nhắn',
        }}
      />
      <Tabs.Screen
        name="booking-detail"
        options={{
          href: null,
          title: 'Chi tiết chuyến đi',
        }}
      />
      <Tabs.Screen
        name="blog-detail"
        options={{
          href: null,
          title: 'Bài viết',
        }}
      />
    </Tabs>
  );
}
