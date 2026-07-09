import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';
import { Power, ShieldCheck, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontForWeight, fontSize, spacing, shadows } from '@/theme/tokens';

type Props = {
  enabled: boolean;
  loading?: boolean;
  verificationStatus?: string;
  onPress: () => void;
};

export function DriverStatusPill({ enabled, loading = false, verificationStatus, onPress }: Props) {
  const { colors, isDark } = useTheme();
  const progress = useRef(new Animated.Value(enabled ? 1 : 0)).current;
  const isVerified = verificationStatus === 'APPROVED' || verificationStatus === 'VERIFIED';

  useEffect(() => {
    Animated.spring(progress, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 95,
    }).start();
  }, [enabled, progress]);

  const thumbTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [2, 30] });
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? '#334155' : '#cbd5e1', colors.success],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)',
        borderWidth: 1,
        borderColor: enabled ? colors.success : colors.border,
        ...shadows.md,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: enabled ? colors.success + '22' : colors.surfaceAlt,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={enabled ? colors.success : colors.primary} />
        ) : enabled ? (
          <Power size={17} color={colors.success} />
        ) : (
          <WifiOff size={17} color={colors.textSecondary} />
        )}
      </View>

      <View style={{ minWidth: 104 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.sm, ...fontForWeight('900') }}>
          {enabled ? 'Đang nhận chuyến' : 'Tạm nghỉ'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 1 }}>
          <ShieldCheck size={11} color={isVerified ? colors.success : colors.warning} />
          <Text style={{ color: isVerified ? colors.success : colors.warning, fontSize: 10, ...fontForWeight('800') }}>
            {isVerified ? 'Hồ sơ hợp lệ' : 'Cần hoàn thiện hồ sơ'}
          </Text>
        </View>
      </View>

      <Animated.View
        style={{
          width: 58,
          height: 30,
          borderRadius: 15,
          padding: 2,
          backgroundColor: trackColor,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#fff',
            transform: [{ translateX: thumbTranslate }],
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
