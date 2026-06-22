import React, { useEffect, useRef } from 'react';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronLeft, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { DAIGO_LOGO_URL } from '@/constants/branding';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  notificationsHref?: string;
  backHref?: string;
  showLogo?: boolean;
}

export function AppHeader({
  title,
  showBack = false,
  showNotifications = true,
  notificationsHref = '/(customer)/notifications',
  backHref,
  showLogo = false,
}: AppHeaderProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldShowNotifications = showNotifications && isAuthenticated && !!user?.id;
  const { unreadCount, fetchNotifications } = useNotifications(shouldShowNotifications ? user?.id : undefined);

  useEffect(() => {
    if (!shouldShowNotifications) return;
    fetchNotifications();
  }, [fetchNotifications, shouldShowNotifications]);

  useEffect(() => {
    if (unreadCount <= 0) return;
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1.18, friction: 4, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [unreadCount]);

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        ...shadows.xs,
      }}
    >
      <View
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <View style={{ width: 44 }}>
          {showBack && (
            <TouchableOpacity
              onPress={() => {
                if (backHref) {
                  router.replace(backHref as any);
                  return;
                }
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
              }}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Logo or Title */}
        {showLogo ? (
          <Image
            source={{ uri: DAIGO_LOGO_URL }}
            style={{
              flex: 1,
              height: 34,
              resizeMode: 'contain',
            }}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: 'white',
              fontSize: fontSize.lg,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {shouldShowNotifications && (
            <TouchableOpacity
              onPress={() => router.push(notificationsHref as any)}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Bell size={20} color="white" />
              {unreadCount > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 20,
                    height: 20,
                    borderRadius: borderRadius.full,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 5,
                    transform: [{ scale: pulse }],
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.75}
            style={{
              width: 40,
              height: 40,
              borderRadius: borderRadius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          >
            {isDark ? (
              <Sun size={20} color="white" />
            ) : (
              <Moon size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
