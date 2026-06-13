import React, { useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { useChatStore } from '@/stores/chatStore';

interface LiquidTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function LiquidTabBar({
  state,
  descriptors,
  navigation,
}: LiquidTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const chatUnreadCount = useChatStore((state) =>
    state.conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
  );
  const animations = useRef<Record<string, Animated.Value>>({}).current;
  const hiddenRoutes = [
    'notifications',
    'booking-detail',
    'blog-detail',
    'chat-detail',
    'notification-detail',
    'vehicles',
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
  }).slice(0, 5);

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

  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        paddingTop: spacing.sm,
        backgroundColor: 'transparent',
      }}
    >
      <View
        style={{
          minHeight: 74,
          borderRadius: borderRadius['3xl'],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.xl,
        }}
      >
        {routes.map((route: any) => {
          const index = state.routes.findIndex((item: any) => item.key === route.key);
          const options = descriptors[route.key].options;
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textTertiary;

          if (!animations[route.key]) {
            animations[route.key] = new Animated.Value(0);
          }

          const translateX = animations[route.key].interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-5, 0, 5],
          });
          const scale = focused ? 1.06 : 1;

          const onPress = () => {
            runIconAnimation(route.key);
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
                {route.name === 'chat' && chatUnreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 19,
                      height: 19,
                      borderRadius: borderRadius.full,
                      backgroundColor: colors.error,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
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
