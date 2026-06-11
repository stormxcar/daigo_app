import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { Button } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useTheme } from '@/theme';
import { spacing, fontSize } from '@/theme/tokens';

interface AuthRequiredProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function AuthRequired({
  title = 'Cần đăng nhập',
  description = 'Vui lòng đăng nhập để sử dụng chức năng này.',
  actionLabel = 'Đăng nhập',
  onActionPress = () => router.push('/(auth)/login'),
}: AuthRequiredProps) {
  const { colors } = useTheme();

  return (
    <Screen padding safeArea>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
        }}
      >
        <View style={{ marginBottom: spacing.lg }}>
          <Lock size={48} color={colors.primary} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: '700',
            marginBottom: spacing.sm,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.sm,
            lineHeight: 20,
            marginBottom: spacing.xl,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>
        <Button
          label={actionLabel}
          onPress={onActionPress}
          style={{ alignSelf: 'stretch' }}
        />
      </View>
    </Screen>
  );
}
