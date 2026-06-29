import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Href, Tabs, router } from 'expo-router';
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
  const { isAuthenticated, isSessionRestored, user } = useAuthStore();
  const missingVerificationCount = user
    ? [!user.emailVerified, !user.phoneVerified].filter(Boolean).length
    : 0;
  const detailRoutes = ['notifications', 'chat-detail', 'booking-detail', 'payment-review', 'blog-detail', 'revenue', 'vehicle-detail', 'schedule'];
  const backHrefByRoute: Partial<Record<string, Href>> = {
    notifications: '/(driver)/dashboard',
    'chat-detail': '/(driver)/chat',
    'booking-detail': '/(driver)/bookings',
    schedule: '/(driver)/bookings',
    'blog-detail': '/(driver)/blog',
    'vehicle-detail': '/(driver)/vehicles',
    revenue: '/(driver)/profile',
  };
  const getBackHref = (route: { name: string; params?: Record<string, any> }): Href | undefined => {
    if (route.name === 'payment-review' && route.params?.bookingId) {
      return {
        pathname: '/(driver)/booking-detail' as any,
        params: { id: String(route.params.bookingId) },
      };
    }
    return backHrefByRoute[route.name];
  };

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'driver') {
      router.replace('/(customer)/home');
    }
  }, [isAuthenticated, user?.role]);

  // While the initial session restore is still in progress, show a neutral
  // loading screen instead of AuthRequired — this prevents a false redirect
  // to the login screen during startup or background token refresh.
  if (!isSessionRestored) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        header: ({ options, route }: { options: { title?: string }; route: { name: string; params?: Record<string, any> } }) => (
          <AppHeader
            title={options.title}
            showBack={detailRoutes.includes(route.name)}
            showNotifications={!detailRoutes.includes(route.name)}
            notificationsHref="/(driver)/notifications"
            backHref={getBackHref(route)}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      tabBar={(props: any) => {
        const currentRouteName = props.state.routes[props.state.index]?.name;
        if (detailRoutes.includes(currentRouteName)) return null;
        return <LiquidTabBar {...props} maxTabs={6} />;
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
          tabBarBadge: missingVerificationCount > 0 ? '!' : undefined,
          tabBarIcon: ({ color, size }) => (
            <UserCircle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          href: null,
          title: 'Doanh thu',
        }}
      />
      <Tabs.Screen
        name="vehicle-detail"
        options={{
          href: null,
          title: 'Chi tiết xe',
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
          headerShown: false,
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
        name="schedule"
        options={{
          href: null,
          title: 'Quản lý lịch',
        }}
      />
      <Tabs.Screen
        name="payment-review"
        options={{
          href: null,
          title: 'Xác nhận thanh toán',
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
