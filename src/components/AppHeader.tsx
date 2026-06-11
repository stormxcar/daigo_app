import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronLeft, Moon, Sun } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
}

export function AppHeader({
  title,
  showBack = false,
  showNotifications = true,
}: AppHeaderProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
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
              onPress={() => router.back()}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <ChevronLeft size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.lg,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {showNotifications && (
            <TouchableOpacity
              onPress={() => router.push('/(customer)/notifications')}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Bell size={20} color={colors.text} />
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
              backgroundColor: colors.surface,
            }}
          >
            {isDark ? (
              <Sun size={20} color={colors.warning} />
            ) : (
              <Moon size={20} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
