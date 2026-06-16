import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { Mail } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, toVietnameseAuthError } from '@/utils/authValidation';
import { getAuthRedirectUri } from '@/utils/authRedirect';
import { showError, showSuccess } from '@/utils/toast';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { resetPassword, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSendReset = async () => {
    if (!email) {
      const message = 'Vui lòng nhập email để đặt lại mật khẩu.';
      setLocalError(message);
      showError('Thiếu email', message);
      return;
    }

    if (!isValidEmail(email)) {
      const message = 'Email không đúng định dạng.';
      setLocalError(message);
      showError('Email không hợp lệ', message);
      return;
    }

    try {
      await resetPassword(email, getAuthRedirectUri('auth/reset-password'));
      setSent(true);
      showSuccess('Đã gửi email', 'Vui lòng kiểm tra hộp thư đến hoặc thư rác.');
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      showError('Không thể gửi email', message);
    }
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
      {(error || localError) && (
        <View
          style={{
            backgroundColor: colors.error,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: 'white', fontSize: fontSize.sm }}>
            {error || localError}
          </Text>
        </View>
      )}
      <TextInput
        label="Email"
        placeholder="Nhập email của bạn"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setLocalError('');
        }}
        keyboardType="email-address"
        disabled={isLoading}
        icon={<Mail size={20} color={colors.textSecondary} />}
        style={{ marginBottom: spacing.lg }}
      />

      <Button
        label="Gửi"
        onPress={handleSendReset}
        disabled={!email}
        loading={isLoading}
        style={{ marginBottom: spacing.lg }}
      />

      <Button
        label="Quay lại đăng nhập"
        onPress={() => router.push('/(auth)/login')}
        variant="outline"
        disabled={isLoading}
      />
    </Screen>
  );
}
