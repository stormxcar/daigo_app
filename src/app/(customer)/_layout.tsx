import React from 'react';
import { Href, Tabs } from 'expo-router';
import {
  Home,
  CalendarCheck,
  Newspaper,
  MessageCircle,
  UserCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { LiquidTabBar } from '@/components/LiquidTabBar';
import { useAuthStore } from '@/stores/authStore';

export default function CustomerLayout() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const missingVerificationCount = user
    ? [!user.emailVerified, !user.phoneVerified].filter(Boolean).length
    : 0;
  const detailRoutes = [
    'notifications',
    'booking-detail',
    'map-picker',
    'payment',
    'receipt',
    'blog-detail',
    'chat-detail',
    'notification-detail',
  ];
  const backHrefByRoute: Partial<Record<string, Href>> = {
    notifications: '/(customer)/home',
    'booking-detail': '/(customer)/booking',
    'map-picker': '/(customer)/booking',
    'blog-detail': '/(customer)/blog',
    'chat-detail': '/(customer)/chat',
    'notification-detail': '/(customer)/notifications',
  };
  const getBackHref = (route: { name: string; params?: Record<string, any> }): Href | undefined => {
    if ((route.name === 'payment' || route.name === 'receipt') && route.params?.bookingId) {
      return {
        pathname: '/(customer)/booking-detail' as any,
        params: { id: String(route.params.bookingId) },
      };
    }
    return backHrefByRoute[route.name];
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: ({ options, route }: { options: { title?: string }; route: { name: string; params?: Record<string, any> } }) => (
          <AppHeader
            title={options.title}
            showBack={detailRoutes.includes(route.name)}
            showNotifications={!detailRoutes.includes(route.name)}
            backHref={getBackHref(route)}
            showLogo={route.name === 'home'}
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
        if (currentRouteName === 'map-picker') return null;
        return <LiquidTabBar {...props} />;
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
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
        name="booking"
        options={{
          title: 'Đặt xe',
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck color={color} size={size} />
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
        name="notifications"
        options={{
          href: null,
          title: 'Thông báo',
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
        name="map-picker"
        options={{
          href: null,
          title: 'Chọn vị trí',
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          href: null,
          title: 'Thanh toán',
        }}
      />
      <Tabs.Screen
        name="receipt"
        options={{
          href: null,
          title: 'Biên nhận',
        }}
      />
      <Tabs.Screen
        name="blog-detail"
        options={{
          href: null,
          title: 'Bài viết',
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
        name="notification-detail"
        options={{
          href: null,
          title: 'Chi tiết thông báo',
        }}
      />
    </Tabs>
  );
}
