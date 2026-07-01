import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Check, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { PasswordRequirementCard } from '@/components/PasswordRequirementCard';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { SubmitOverlay } from '@/components/SubmitOverlay';
import { useSubmitLeaveGuard } from '@/hooks/useSubmitLeaveGuard';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { getEmailValidationError, isValidEmail, toVietnameseAuthError, validatePassword } from '@/utils/authValidation';
import { showError, showSuccess, showWarning } from '@/utils/toast';

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
  const [resendCountdown, setResendCountdown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  useSubmitLeaveGuard(
    isSubmitting,
    'Daigo đang xử lý OTP hoặc mật khẩu mới. Thoát lúc này có thể khiến bạn phải thực hiện lại bước hiện tại.',
  );

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = setInterval(() => setResendCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const showLocalError = (title: string, message: string) => {
    setLocalError(message);
    showError(title, message);
  };

  const handleSendOtp = async () => {
    if (step !== 'email' && resendCountdown > 0) {
      showLocalError('Vui lòng chờ', `Bạn có thể gửi lại OTP sau ${resendCountdown} giây.`);
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailError = getEmailValidationError(normalizedEmail);
    if (emailError) {
      setFieldErrors((current) => ({ ...current, email: emailError }));
      emailRef.current?.focus();
      showLocalError('Email không hợp lệ', emailError);
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError('');
      setFieldErrors({});
      await apiClient.resetPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setStep('otp');
      setResendCountdown(60);
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

  // ── Animated refs ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2;

  useEffect(() => {
    // Pulse animation cho step active
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [step, pulseAnim]);

  useEffect(() => {
    // Progress line animation
    Animated.timing(progressAnim, {
      toValue: stepIndex,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [stepIndex, progressAnim]);

  const renderStepIndicator = () => {
    const steps: ResetStep[] = ['email', 'otp', 'password'];
    const labels = ['Email', 'Xác minh', 'Mật khẩu'];
    const icons = [
      <Mail size={18} color="white" />,
      <ShieldCheck size={18} color="white" />,
      <KeyRound size={18} color="white" />,
    ];

    return (
      <View style={{ marginBottom: spacing.xl }}>
        {/* ── Connector + circles row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          {steps.map((item, index) => {
            const active = step === item;
            const done = stepIndex > index;
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={item}>
                {/* Circle */}
                <View style={{ alignItems: 'center' }}>
                  {active ? (
                    <Animated.View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.45,
                        shadowRadius: 8,
                        elevation: 8,
                        transform: [{ scale: pulseAnim }],
                      }}
                    >
                      {icons[index]}
                    </Animated.View>
                  ) : done ? (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.success,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: colors.success,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Check size={20} color="white" strokeWidth={3} />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 2,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.textTertiary, fontWeight: '800', fontSize: 15 }}>
                        {index + 1}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Connector line */}
                {!isLast && (
                  <View style={{ flex: 1, height: 3, backgroundColor: colors.surfaceAlt, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }}>
                    <Animated.View
                      style={{
                        height: '100%',
                        backgroundColor: done ? colors.success : colors.primary,
                        borderRadius: 2,
                        width: progressAnim.interpolate({
                          inputRange: [index, index + 1],
                          outputRange: ['0%', '100%'],
                          extrapolate: 'clamp',
                        }),
                      }}
                    />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Labels row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {steps.map((item, index) => {
            const active = step === item;
            const done = stepIndex > index;
            const isLast = index === steps.length - 1;
            return (
              <React.Fragment key={item + '_label'}>
                <View style={{ alignItems: 'center', width: 44 }}>
                  <Text
                    style={{
                      fontSize: fontSize.xs,
                      fontWeight: active ? '900' : '600',
                      color: active ? colors.primary : done ? colors.success : colors.textTertiary,
                      textAlign: 'center',
                    }}
                  >
                    {labels[index]}
                  </Text>
                </View>
                {!isLast && <View style={{ flex: 1 }} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Screen scroll padding>
      <SubmitOverlay
        visible={isSubmitting}
        message={
          step === 'email'
            ? 'Đang gửi OTP...'
            : step === 'otp'
            ? 'Đang xác minh OTP...'
            : 'Đang cập nhật mật khẩu...'
        }
        description="Vui lòng chờ trong giây lát để Daigo lưu trạng thái an toàn."
      />
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
            label={resendCountdown > 0 ? `Gửi lại sau ${resendCountdown}s` : 'Gửi lại OTP'}
            onPress={handleSendOtp}
            disabled={isSubmitting || resendCountdown > 0}
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
            preventBulkInput
            onBulkInputBlocked={() =>
              showWarning('Không thể dán mật khẩu', 'Vui lòng nhập thủ công phần xác nhận mật khẩu.')
            }
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
