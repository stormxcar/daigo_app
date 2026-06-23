import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { isValidEmail, toVietnameseAuthError } from '@/utils/authValidation';
import { showError, showSuccess } from '@/utils/toast';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifySignupOtp, resendSignupOtp, isLoading, error } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [notice, setNotice] = useState('');

  const handleVerify = async () => {
    if (!email || !otp) {
      const message = 'Vui lòng nhập email và mã OTP.';
      setLocalError(message);
      showError('Thiếu thông tin', message);
      return;
    }

    if (!isValidEmail(email)) {
      const message = 'Email không đúng định dạng.';
      setLocalError(message);
      showError('Email không hợp lệ', message);
      return;
    }

    try {
      const response = await verifySignupOtp(email, otp);
      showSuccess('Xác thực thành công', 'Tài khoản đã được kích hoạt.');
      router.replace(response.user.role === 'customer' ? '/(customer)/home' : '/(driver)/dashboard');
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      showError('Không thể xác thực', message);
    }
  };

  const handleResend = async () => {
    if (!email) {
      const message = 'Vui lòng nhập email để gửi lại OTP.';
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
      await resendSignupOtp(email);
      setNotice('Mã OTP mới đã được gửi đến email của bạn.');
      setLocalError('');
      showSuccess('Đã gửi lại OTP', 'Vui lòng kiểm tra email của bạn.');
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      showError('Không thể gửi lại OTP', message);
    }
  };

  return (
    <Screen scroll padding>
      {(error || localError || notice) && (
        <View
          style={{
            backgroundColor: error || localError ? colors.error : colors.success,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: 'white', fontSize: fontSize.sm }}>
            {error || localError || notice}
          </Text>
        </View>
      )}

      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        Xác thực email
      </Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg }}>
        Nhập mã OTP được Supabase gửi về email sau khi đăng ký để kích hoạt tài khoản.
      </Text>

      <TextInput
        label="Email"
        placeholder="Nhập email"
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

      <OtpCodeInput
        label="Mã OTP"
        value={otp}
        onChangeText={(value) => {
          setOtp(value.replace(/\D/g, '').slice(0, 6));
          setLocalError('');
        }}
        disabled={isLoading}
        error={localError && !/^\d{6}$/.test(otp.trim()) ? localError : undefined}
      />

      <Button label="Xác thực tài khoản" onPress={handleVerify} loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
      <Button label="Gửi lại OTP" onPress={handleResend} variant="outline" loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
      <Button label="Quay lại đăng nhập" onPress={() => router.replace('/(auth)/login')} variant="outline" disabled={isLoading} />
    </Screen>
  );
}
