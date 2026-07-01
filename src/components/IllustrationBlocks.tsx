import React from 'react';
import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Car, MapPinned, Newspaper, Route, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';

interface IllustrationBlockProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  height?: number;
  tone?: 'primary' | 'success' | 'info' | 'warning';
}

export function IllustrationBlock({
  title,
  subtitle,
  icon,
  height = 120,
  tone = 'primary',
}: IllustrationBlockProps) {
  const { colors } = useTheme();
  const toneColor =
    tone === 'success'
      ? colors.success
      : tone === 'info'
        ? colors.info
        : tone === 'warning'
          ? colors.warning
          : colors.primary;

  return (
    <View
      style={{
        height,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        padding: spacing.md,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: height,
          height,
          borderRadius: height / 2,
          right: -height / 3,
          top: -height / 3,
          backgroundColor: toneColor,
          opacity: 0.16,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: toneColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ?? <Sparkles size={24} color="white" />}
        </View>
        <Route size={44} color={toneColor} opacity={0.22} />
      </View>
      {(title || subtitle) && (
        <View>
          {!!title && (
            <Text numberOfLines={1} style={{ color: colors.text, ...fontForWeight('900'), fontSize: fontSize.base }}>
              {title}
            </Text>
          )}
          {!!subtitle && (
            <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export const defaultVehicleIllustration = (color: string) => <Car size={24} color={color} />;
export const defaultMapIllustration = (color: string) => <MapPinned size={24} color={color} />;
export const defaultNewsIllustration = (color: string) => <Newspaper size={24} color={color} />;
