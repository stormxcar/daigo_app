import React, { useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { useChatStore } from '@/stores/chatStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { apiClient } from '@/services/api';
import { NotificationItem } from '@/types';

interface LiquidTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  maxTabs?: number;
}

export function LiquidTabBar({
  state,
  descriptors,
  navigation,
  maxTabs = 5,
}: LiquidTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const chatUnreadCount = useChatStore((state) =>
    state.conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
  );
  const notifications = useNotificationStore((state) => state.notifications);
  const markManyAsRead = useNotificationStore((state) => state.markManyAsRead);
  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const animations = useRef<Record<string, Animated.Value>>({}).current;
  const hiddenRoutes = [
    'notifications',
    'booking-detail',
    'blog-detail',
    'chat-detail',
    'notification-detail',
    'faq',
    'emergency',
  ];
  const currentRoute = state.routes[state.index];

  if (hiddenRoutes.includes(currentRoute?.name)) {
    return null;
  }

  const routes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options;
    return !hiddenRoutes.includes(route.name) && options?.href !== null;
  }).slice(0, maxTabs);

  const runIconAnimation = (key: string) => {
    if (!animations[key]) {
      animations[key] = new Animated.Value(0);
    }

    Animated.sequence([
      Animated.timing(animations[key], {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(animations[key], {
        toValue: -1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(animations[key], {
        toValue: 0,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getRouteNotifications = (routeName: string, items: NotificationItem[]) => {
    if (routeName === 'blog') {
      return items.filter((notification) => notification.type === 'blog_interaction' || !!notification.relatedPostId);
    }
    if (routeName === 'booking' || routeName === 'bookings') {
      return items.filter((notification) =>
        notification.type !== 'incoming_call' &&
        (
          !!notification.relatedBookingId ||
          ['booking_success', 'driver_confirm', 'driver_cancel', 'trip_done', 'booking_update', 'payment_update'].includes(notification.type)
        )
      );
    }
    if (routeName === 'dashboard') {
      return items.filter((notification) => notification.type === 'booking_update' || notification.type === 'payment_update');
    }
    return [];
  };

  const markRouteNotificationsAsRead = (routeName: string) => {
    const ids = getRouteNotifications(routeName, unreadNotifications).map((notification) => notification.id);
    if (ids.length === 0) return;
    markManyAsRead(ids);
    apiClient.markNotificationsAsRead(ids).catch(() => undefined);
  };

  const getRouteBadge = (routeName: string, optionBadge: any) => {
    if (routeName === 'chat') return chatUnreadCount > 0 ? chatUnreadCount : undefined;
    const routeNotificationCount = getRouteNotifications(routeName, unreadNotifications).length;
    if (routeNotificationCount > 0) return routeNotificationCount;
    return optionBadge;
  };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        elevation: 50,
        paddingHorizontal: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        paddingTop: spacing.lg,
        backgroundColor: 'transparent',
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['rgba(15,23,42,0.70)', 'rgba(15,23,42,0.32)', 'rgba(15,23,42,0)']
            : ['rgba(255,255,255,0.82)', 'rgba(255,255,255,0.36)', 'rgba(255,255,255,0)']
        }
        locations={[0, 0.56, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.max(insets.bottom, spacing.md) + 70,
        }}
      />
      <View
        style={{
          minHeight: 74,
          borderRadius: borderRadius['3xl'],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(226, 232, 240, 0.88)',
          ...shadows.xl,
        }}
      >
        {routes.map((route: any) => {
          const index = state.routes.findIndex((item: any) => item.key === route.key);
          const options = descriptors[route.key].options;
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textTertiary;
          const routeBadge = getRouteBadge(route.name, options.tabBarBadge);

          if (!animations[route.key]) {
            animations[route.key] = new Animated.Value(0);
          }

          const translateX = animations[route.key].interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-5, 0, 5],
          });
          const onPress = () => {
            runIconAnimation(route.key);
            markRouteNotificationsAsRead(route.name);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.82}
              style={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                height: 64,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: borderRadius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused
                    ? colors.primary
                    : isDark
                      ? 'rgba(71, 85, 105, 0.55)'
                      : 'rgba(241, 245, 249, 0.9)',
                }}
              >
                <Animated.View style={{ transform: [{ translateX }] }}>
                  {options.tabBarIcon?.({
                    color: focused ? 'white' : color,
                    size: 22,
                    focused,
                  })}
                </Animated.View>
                {routeBadge !== undefined && routeBadge !== null && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 19,
                      height: 19,
                      borderRadius: borderRadius.full,
                      backgroundColor: route.name === 'profile' ? colors.warning : colors.error,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>
                      {typeof routeBadge === 'number' && routeBadge > 99 ? '99+' : String(routeBadge)}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color,
                  fontSize: fontSize.xs,
                  fontWeight: focused ? '700' : '600',
                  textAlign: 'center',
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
