import React, { ReactNode, useEffect, useState } from 'react';
import { InteractionManager, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, spacing } from '@/theme/tokens';

type LazyMountProps = {
  children: ReactNode;
  minHeight?: number;
  label?: string;
  style?: ViewStyle;
};

export function LazyMount({ children, minHeight = 260, label = 'Đang chuẩn bị nội dung...', style }: LazyMountProps) {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  if (ready) return <>{children}</>;

  return (
    <View
      style={[
        {
          minHeight,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.textSecondary, ...fontForWeight('700'), textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
