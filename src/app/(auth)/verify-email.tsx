import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound, Mail } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { isValidEmail, toVietnameseAuthError } from '@/utils/authValidation';

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
      Alert.alert('Thiếu thông tin', message);
      return;
    }

    if (!isValidEmail(email)) {
      const message = 'Email không đúng định dạng.';
      setLocalError(message);
      Alert.alert('Email không hợp lệ', message);
      return;
    }

    try {
      const response = await verifySignupOtp(email, otp);
      router.replace(response.user.role === 'customer' ? '/(customer)/home' : '/(driver)/dashboard');
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      Alert.alert('Không thể xác thực', message);
    }
  };

  const handleResend = async () => {
    if (!email) {
      const message = 'Vui lòng nhập email để gửi lại OTP.';
      setLocalError(message);
      Alert.alert('Thiếu email', message);
      return;
    }

    if (!isValidEmail(email)) {
      const message = 'Email không đúng định dạng.';
      setLocalError(message);
      Alert.alert('Email không hợp lệ', message);
      return;
    }

    try {
      await resendSignupOtp(email);
      setNotice('Mã OTP mới đã được gửi đến email của bạn.');
      setLocalError('');
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      Alert.alert('Không thể gửi lại OTP', message);
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

      <TextInput
        label="Mã OTP"
        placeholder="Nhập mã OTP"
        value={otp}
        onChangeText={(value) => {
          setOtp(value);
          setLocalError('');
        }}
        keyboardType="numeric"
        disabled={isLoading}
        icon={<KeyRound size={20} color={colors.textSecondary} />}
        style={{ marginBottom: spacing.lg }}
      />

      <Button label="Xác thực tài khoản" onPress={handleVerify} loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
      <Button label="Gửi lại OTP" onPress={handleResend} variant="outline" loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
      <Button label="Quay lại đăng nhập" onPress={() => router.replace('/(auth)/login')} variant="outline" disabled={isLoading} />
    </Screen>
  );
}
