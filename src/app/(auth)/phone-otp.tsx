import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, Smartphone } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { isFirebasePhoneAuthEnabled, isTestPhoneOtpEnabled, isValidVietnamPhone, normalizeVietnamPhone, TEST_PHONE_OTP } from '@/services/phoneAuthConfig';
import { toVietnameseAuthError } from '@/utils/authValidation';
import { showError, showSuccess } from '@/utils/toast';

export default function PhoneOtpScreen() {
  const { colors } = useTheme();
  const { sendPhoneOtp, verifyPhoneOtp, isLoading, user } = useAuth();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countdown, setCountdown] = useState(0);
  const [localError, setLocalError] = useState('');

  const normalizedPhone = useMemo(() => normalizeVietnamPhone(phone), [phone]);
  const firebasePhoneAuthEnabled = isFirebasePhoneAuthEnabled();
  const testOtpEnabled = isTestPhoneOtpEnabled();
  const fallbackHref = user?.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/home';
  const continueLater = () => {
    router.replace((redirectTo as any) || fallbackHref);
  };

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const requestOtp = async () => {
    setLocalError('');
    if (!isValidVietnamPhone(phone)) {
      const message = 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.';
      setLocalError(message);
      showError('Số điện thoại chưa đúng', message);
      return;
    }

    try {
      await sendPhoneOtp(phone);
      setStep('otp');
      setCountdown(60);
      showSuccess(
        testOtpEnabled ? 'OTP test đã sẵn sàng' : 'Đã gửi OTP',
        testOtpEnabled ? `Dùng mã ${TEST_PHONE_OTP} để xác minh số ${normalizedPhone}.` : `Mã xác minh đã được gửi tới ${normalizedPhone}.`
      );
    } catch (error: any) {
      const message = toVietnameseAuthError(error?.message);
      setLocalError(message);
      showError('Không thể gửi OTP', message);
    }
  };

  const confirmOtp = async () => {
    setLocalError('');
    if (!/^\d{6}$/.test(otp.trim())) {
      const message = 'Mã OTP phải gồm 6 chữ số.';
      setLocalError(message);
      showError('OTP chưa đúng', message);
      return;
    }

    try {
      const response = await verifyPhoneOtp(phone, otp);
      showSuccess('Xác minh thành công', `Xin chào ${response.user.fullName}.`);
      router.replace((redirectTo as any) || (response.user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/home'));
    } catch (error: any) {
      const message = toVietnameseAuthError(error?.message);
      setLocalError(message);
      showError('Không thể xác minh OTP', message);
    }
  };

  if ((firebasePhoneAuthEnabled || testOtpEnabled) && !user) {
    return (
      <AuthRequired
        title="Đăng nhập trước"
        description="Vui lòng đăng nhập bằng Email hoặc Google trước. Firebase chỉ dùng để xác minh SĐT và lưu trạng thái vào Supabase."
        actionLabel="Đăng nhập"
        onActionPress={() => router.replace('/(auth)/login')}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen scroll padding>
        <View
          style={{
            alignItems: 'center',
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
          }}
        >
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            {step === 'phone' ? <Smartphone size={34} color={colors.primary} /> : <ShieldCheck size={34} color={colors.primary} />}
          </View>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: spacing.xs }}>
            {step === 'phone' ? 'Xác minh số điện thoại' : 'Nhập mã OTP'}
          </Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 21 }}>
            {step === 'phone'
              ? firebasePhoneAuthEnabled
                ? 'Daigo dùng Firebase để gửi OTP xác minh số điện thoại. Bạn có thể hoàn tất bước này sau.'
                : testOtpEnabled
                ? `Giai đoạn test dùng OTP cố định ${TEST_PHONE_OTP}. Bạn có thể bỏ qua và xác minh sau.`
                : 'Daigo sẽ gửi mã xác minh qua SMS để bảo vệ tài khoản. Bạn có thể thực hiện sau trong Hồ sơ.'
              : testOtpEnabled
                ? `Nhập mã test ${TEST_PHONE_OTP} cho ${normalizedPhone}.`
                : `Mã OTP đã được gửi tới ${normalizedPhone}.`}
          </Text>
        </View>

        {!!localError && (
          <View
            style={{
              padding: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.error,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.sm }}>{localError}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <>
            <TextInput
              label="Số điện thoại"
              placeholder="Ví dụ: 0912345678"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setLocalError('');
              }}
              keyboardType="phone-pad"
              disabled={isLoading}
              icon={<Smartphone size={20} color={colors.textSecondary} />}
              style={{ marginBottom: spacing.lg }}
            />
            <Button label="Gửi mã OTP" onPress={requestOtp} loading={isLoading} disabled={isLoading} />
            <Button
              label="Để sau"
              onPress={continueLater}
              variant="outline"
              style={{ marginTop: spacing.md }}
              disabled={isLoading}
            />
          </>
        ) : (
          <>
            <OtpCodeInput
              label="Mã OTP"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                setLocalError('');
              }}
              disabled={isLoading}
              error={localError && !/^\d{6}$/.test(otp.trim()) ? localError : undefined}
            />
            <Button label="Xác minh" onPress={confirmOtp} loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
            <TouchableOpacity
              onPress={requestOtp}
              disabled={isLoading || countdown > 0}
              style={{ alignItems: 'center', opacity: countdown > 0 ? 0.55 : 1 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại OTP'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={continueLater}
              disabled={isLoading}
              style={{ alignItems: 'center', marginTop: spacing.md }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>Xác minh sau</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: spacing['4xl'] }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
