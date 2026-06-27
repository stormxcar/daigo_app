import React, { useRef, useState } from 'react';
import { Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { PasswordRequirementCard } from '@/components/PasswordRequirementCard';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { isValidEmail, toVietnameseAuthError, validatePassword } from '@/utils/authValidation';
import { showError, showSuccess } from '@/utils/toast';

type ResetStep = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { restoreSession } = useAuthStore();
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const showLocalError = (title: string, message: string) => {
    setLocalError(message);
    showError(title, message);
  };

  const handleSendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFieldErrors((current) => ({ ...current, email: 'Vui lòng nhập email để đặt lại mật khẩu.' }));
      emailRef.current?.focus();
      showLocalError('Thiếu email', 'Vui lòng nhập email để đặt lại mật khẩu.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setFieldErrors((current) => ({ ...current, email: 'Email không đúng định dạng.' }));
      emailRef.current?.focus();
      showLocalError('Email không hợp lệ', 'Email không đúng định dạng.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError('');
      setFieldErrors({});
      await apiClient.resetPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setStep('otp');
      showSuccess(
        'Kiểm tra email',
        'Nếu email đã được đăng ký, mã OTP sẽ được gửi đến hộp thư đến hoặc thư rác.',
      );
    } catch (err: any) {
      showLocalError('Không thể gửi OTP', toVietnameseAuthError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      showLocalError('Thiếu OTP', 'Vui lòng nhập mã OTP trong email.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError('');
      const response = await apiClient.verifyRecoveryOtp(email, cleanOtp);
      restoreSession(response.user, response.token);
      setStep('password');
      showSuccess('OTP hợp lệ', 'Bây giờ bạn có thể tạo mật khẩu mới.');
    } catch (err: any) {
      showLocalError('OTP không hợp lệ', toVietnameseAuthError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      const nextErrors = {
        password: password ? undefined : 'Vui lòng nhập mật khẩu mới.',
        confirmPassword: confirmPassword ? undefined : 'Vui lòng nhập lại mật khẩu mới.',
      };
      setFieldErrors(nextErrors);
      if (nextErrors.password) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      showLocalError('Thiếu mật khẩu', 'Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldErrors((current) => ({ ...current, password: passwordError }));
      passwordRef.current?.focus();
      showLocalError('Mật khẩu chưa hợp lệ', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors((current) => ({ ...current, confirmPassword: 'Mật khẩu xác nhận không khớp.' }));
      confirmPasswordRef.current?.focus();
      showLocalError('Mật khẩu không khớp', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError('');
      await apiClient.updatePassword(password);
      showSuccess('Đã cập nhật mật khẩu', 'Bạn có thể đăng nhập bằng mật khẩu mới.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      showLocalError('Không thể cập nhật mật khẩu', toVietnameseAuthError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: ResetStep[] = ['email', 'otp', 'password'];
    const labels = ['Email', 'OTP', 'Mật khẩu'];
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {steps.map((item, index) => {
          const active = step === item;
          const done = steps.indexOf(step) > index;
          return (
            <View
              key={item}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                backgroundColor: active || done ? colors.primary : colors.surfaceAlt,
              }}
            >
              <Text style={{ color: active || done ? 'white' : colors.textSecondary, fontWeight: '800', fontSize: fontSize.xs }}>
                {labels[index]}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Screen scroll padding>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: spacing.xs }}>
        Quên mật khẩu
      </Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg }}>
        Nhập email, xác minh OTP rồi tạo mật khẩu mới cho tài khoản của bạn.
      </Text>

      {renderStepIndicator()}

      {!!localError && (
        <View
          style={{
            backgroundColor: colors.error,
            padding: spacing.md,
            borderRadius: borderRadius.md,
            marginBottom: spacing.lg,
          }}
        >
          <Text style={{ color: 'white', fontSize: fontSize.sm }}>{localError}</Text>
        </View>
      )}

      {step === 'email' && (
        <>
          <TextInput
            ref={emailRef}
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setLocalError('');
              setFieldErrors((current) => ({
                ...current,
                email: value.trim() && isValidEmail(value) ? undefined : current.email,
              }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
            disabled={isSubmitting}
            error={fieldErrors.email}
            icon={<Mail size={20} color={colors.textSecondary} />}
            style={{ marginBottom: spacing.lg }}
          />
          <Button
            label="Gửi mã OTP"
            onPress={handleSendOtp}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ marginBottom: spacing.lg }}
          />
        </>
      )}

      {step === 'otp' && (
        <>
          <View style={{ padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
              Nếu {email} đã được đăng ký, mã OTP sẽ được gửi đến hộp thư đến hoặc thư rác.
            </Text>
          </View>
          <OtpCodeInput
            label="Mã OTP"
            value={otp}
            onChangeText={(value) => {
              setOtp(value.replace(/\D/g, '').slice(0, 6));
              setLocalError('');
            }}
            disabled={isSubmitting}
            error={localError && !/^\d{6}$/.test(otp.trim()) ? localError : undefined}
          />
          <Button
            label="Xác minh OTP"
            onPress={handleVerifyOtp}
            disabled={!otp || isSubmitting}
            loading={isSubmitting}
            style={{ marginBottom: spacing.md }}
          />
          <Button
            label="Gửi lại OTP"
            onPress={handleSendOtp}
            disabled={isSubmitting}
            variant="outline"
            style={{ marginBottom: spacing.md }}
          />
          <Button
            label="Đổi email"
            onPress={() => {
              setStep('email');
              setOtp('');
              setLocalError('');
            }}
            disabled={isSubmitting}
            variant="secondary"
          />
        </>
      )}

      {step === 'password' && (
        <>
          <TextInput
            ref={passwordRef}
            label="Mật khẩu mới"
            placeholder="Nhập mật khẩu mới"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setLocalError('');
              setFieldErrors((current) => ({
                ...current,
                password: validatePassword(value) ? current.password : undefined,
                confirmPassword: confirmPassword && value === confirmPassword ? undefined : current.confirmPassword,
              }));
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            disabled={isSubmitting}
            error={fieldErrors.password}
            icon={<Lock size={20} color={colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)} disabled={isSubmitting}>
                {showPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            }
            style={{ marginBottom: spacing.sm }}
          />
          <View style={{ marginBottom: spacing.lg }}>
            <PasswordRequirementCard password={password} />
          </View>
          <TextInput
            ref={confirmPasswordRef}
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setLocalError('');
              setFieldErrors((current) => ({
                ...current,
                confirmPassword: value && value === password ? undefined : current.confirmPassword,
              }));
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            returnKeyType="done"
            onSubmitEditing={handleUpdatePassword}
            contextMenuHidden
            disabled={isSubmitting}
            error={fieldErrors.confirmPassword}
            icon={<Lock size={20} color={colors.textSecondary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} disabled={isSubmitting}>
                {showConfirmPassword ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            }
            style={{ marginBottom: spacing.lg }}
          />
          <Button
            label="Cập nhật mật khẩu"
            onPress={handleUpdatePassword}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ marginBottom: spacing.lg }}
          />
        </>
      )}

      <Button
        label="Quay lại đăng nhập"
        onPress={() => router.push('/(auth)/login')}
        variant="outline"
        disabled={isSubmitting}
      />
    </Screen>
  );
}
