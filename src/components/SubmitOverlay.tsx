import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';

type SubmitOverlayProps = {
  visible: boolean;
  message: string;
  description?: string;
};

export function SubmitOverlay({ visible, message, description }: SubmitOverlayProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.56)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xl,
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.base,
              ...fontForWeight('900'),
              textAlign: 'center',
              marginTop: spacing.md,
            }}
          >
            {message}
          </Text>
          {!!description && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                lineHeight: 20,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
