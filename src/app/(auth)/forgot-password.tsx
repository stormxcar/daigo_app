import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { Mail } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendReset = () => {
    if (!email) return;
    setSent(true);
  };

  if (sent) {
    return (
      <Screen padding>
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            padding: spacing.lg,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.base, lineHeight: 24 }}>
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email {email}. Vui lòng kiểm tra hộp thư đến hoặc thư rác.
          </Text>
        </View>

        <Button
          label="Quay lại đăng nhập"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginBottom: spacing.lg }}
        />

        <Button
          label="Thay đổi email"
          onPress={() => setSent(false)}
          variant="outline"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padding>
      <TextInput
        label="Email"
        placeholder="Nhập email của bạn"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        icon={<Mail size={20} color={colors.textSecondary} />}
        style={{ marginBottom: spacing.lg }}
      />

      <Button
        label="Gửi"
        onPress={handleSendReset}
        disabled={!email}
        style={{ marginBottom: spacing.lg }}
      />

      <Button
        label="Quay lại đăng nhập"
        onPress={() => router.push('/(auth)/login')}
        variant="outline"
      />
    </Screen>
  );
}
