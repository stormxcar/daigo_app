import React from 'react';
import { Tabs } from 'expo-router';
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

export default function CustomerLayout() {
  const { colors } = useTheme();
  const detailRoutes = [
    'notifications',
    'booking-detail',
    'blog-detail',
    'chat-detail',
    'notification-detail',
  ];
  const backHrefByRoute: Record<string, string> = {
    notifications: '/(customer)/home',
    'booking-detail': '/(customer)/booking',
    'blog-detail': '/(customer)/blog',
    'chat-detail': '/(customer)/chat',
    'notification-detail': '/(customer)/notifications',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: ({ options, route }: { options: { title?: string }; route: { name: string } }) => (
          <AppHeader
            title={options.title}
            showBack={detailRoutes.includes(route.name)}
            showNotifications={!detailRoutes.includes(route.name)}
            backHref={backHrefByRoute[route.name]}
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
      }}
      tabBar={(props: any) => <LiquidTabBar {...props} />}
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
