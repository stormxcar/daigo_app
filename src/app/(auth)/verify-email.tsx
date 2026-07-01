import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput as RNTextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { Screen } from '@/components/ScreenComponents';
import { SubmitOverlay } from '@/components/SubmitOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useSubmitLeaveGuard } from '@/hooks/useSubmitLeaveGuard';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { getEmailValidationError, isValidEmail, toVietnameseAuthError } from '@/utils/authValidation';
import { showError, showSuccess } from '@/utils/toast';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string; next?: string; intent?: string }>();
  const isDriverIntent = params.next === 'driver-onboarding' || params.intent === 'driver';
  const { verifySignupOtp, resendSignupOtp, isLoading, error } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const emailRef = useRef<RNTextInput>(null);

  useSubmitLeaveGuard(
    isLoading,
    'Daigo đang xác thực OTP hoặc gửi lại mã mới. Thoát lúc này có thể khiến bạn phải thao tác lại.',
  );

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = setInterval(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleVerify = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!otp) {
      const message = 'Vui lòng nhập mã OTP.';
      setLocalError(message);
      showError('Thiếu thông tin', message);
      return;
    }

    const emailValidationError = getEmailValidationError(normalizedEmail);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      emailRef.current?.focus();
      setLocalError(emailValidationError);
      showError('Email không hợp lệ', emailValidationError);
      return;
    }

    try {
      const response = await verifySignupOtp(normalizedEmail, otp);
      showSuccess('Xác thực thành công', 'Tài khoản đã được kích hoạt.');
      router.replace(
        isDriverIntent
          ? {
              pathname: '/(auth)/driver-register' as any,
              params: { intent: 'driver' },
            }
          : (response.user.role === 'customer' ? '/(customer)/home' : '/(driver)/dashboard') as any,
      );
    } catch (err: any) {
      const message = toVietnameseAuthError(err.message);
      setLocalError(message);
      showError('Không thể xác thực', message);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) {
      showError('Vui lòng chờ', `Bạn có thể gửi lại OTP sau ${resendCountdown} giây.`);
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailValidationError = getEmailValidationError(normalizedEmail);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      emailRef.current?.focus();
      setLocalError(emailValidationError);
      showError('Email không hợp lệ', emailValidationError);
      return;
    }

    try {
      await resendSignupOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setResendCountdown(60);
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
      <SubmitOverlay
        visible={isLoading}
        message="Đang xử lý OTP email..."
        description="Vui lòng giữ màn hình này cho đến khi Daigo hoàn tất xác thực."
      />
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

      <Text style={{ color: colors.text, fontSize: 20, ...fontForWeight('800'), marginBottom: spacing.sm }}>
        Xác thực email
      </Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg }}>
        Nhập mã OTP được Supabase gửi về email sau khi đăng ký để kích hoạt tài khoản.
      </Text>

      <TextInput
        ref={emailRef}
        label="Email"
        placeholder="Nhập email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(value.trim() && isValidEmail(value) ? '' : emailError);
          setLocalError('');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="done"
        disabled={isLoading}
        error={emailError}
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
      <Button
        label={resendCountdown > 0 ? `Gửi lại sau ${resendCountdown}s` : 'Gửi lại OTP'}
        onPress={handleResend}
        variant="outline"
        loading={isLoading}
        disabled={isLoading || resendCountdown > 0}
        style={{ marginBottom: spacing.md }}
      />
      <Button
        label="Quay lại đăng nhập"
        onPress={() =>
          router.replace({
            pathname: '/(auth)/login' as any,
            params: isDriverIntent ? { next: 'driver-onboarding', intent: 'driver' } : undefined,
          })
        }
        variant="outline"
        disabled={isLoading}
      />
    </Screen>
  );
}
