import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';

type Props = {
  loading?: boolean;
  label?: string;
};

export function VideoLoadingOverlay({ loading, label }: Props) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          minWidth: 58,
          minHeight: 58,
          borderRadius: borderRadius.full,
          backgroundColor: 'rgba(0,0,0,0.42)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.sm,
        }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Play size={24} color="white" fill="white" />}
      </View>
      {!!label && (
        <Text style={{ color: 'white', fontSize: fontSize.xs, fontWeight: '800', marginTop: spacing.sm }}>
          {label}
        </Text>
      )}
    </View>
  );
}
