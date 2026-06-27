import React, { useRef, useState } from 'react';
import { Image, View, Text, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { PasswordRequirementCard } from '@/components/PasswordRequirementCard';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react-native';
import { isValidEmail, toVietnameseAuthError, validatePassword } from '@/utils/authValidation';
import { DAIGO_LOGO_URL } from '@/constants/branding';
import { showError as showErrorToast, showInfo, showSuccess } from '@/utils/toast';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, isLoading, error } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const fullNameRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const phoneRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const showError = (message: string) => {
    setLocalError(message);
    showErrorToast('Không thể đăng ký', message);
  };

  const validateRegister = () => {
    const nextErrors: typeof fieldErrors = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
    if (!email.trim()) nextErrors.email = 'Vui lòng nhập email.';
    else if (!isValidEmail(email)) nextErrors.email = 'Email không đúng định dạng.';
    if (phone.trim().length < 9) nextErrors.phone = 'Số điện thoại không hợp lệ.';
    const passwordError = validatePassword(password);
    if (passwordError) nextErrors.password = passwordError;
    if (!confirmPassword) nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
    else if (password !== confirmPassword) nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    setFieldErrors(nextErrors);
    setLocalError('');
    if (nextErrors.fullName) fullNameRef.current?.focus();
    else if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.phone) phoneRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
    else if (nextErrors.confirmPassword) confirmPasswordRef.current?.focus();
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;
    try {
      const response = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });
      if (response.token) {
        router.replace(response.user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/home');
        showSuccess('Đăng ký thành công', `Tài khoản ${response.user.fullName} đã sẵn sàng.`);
      } else {
        showInfo('Xác thực email', 'Tài khoản đã được tạo. Vui lòng nhập mã OTP được gửi về email để kích hoạt tài khoản.');
        router.replace({
          pathname: '/(auth)/verify-email' as any,
          params: { email: email.trim().toLowerCase() },
        });
      }
    } catch (err: any) {
      showError(toVietnameseAuthError(err.message));
    }
  };

  return (
    <Screen scroll padding>
      {/* ─── LOGO COMPACT HEADER ─── */}
      <View
        style={{
          alignItems: 'center',
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        <Image
          source={{ uri: "https://res.cloudinary.com/dzwjgfd7t/image/upload/v1782178208/booking_daigo/logo_text_no_bg-removebg-preview_dsu4n1.png" }}
          style={{
            width: 130,
            height: 56,
            resizeMode: 'contain',
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          marginBottom: spacing.xs,
        }}
      >
        Tạo tài khoản
      </Text>
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.textSecondary,
          marginBottom: spacing.lg,
        }}
      >
        Chào mừng bạn đến với Daigo!
      </Text>

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

      <View style={{ marginBottom: spacing.lg }}>
        <TextInput
          label="Họ và tên"
          placeholder="Nhập họ và tên"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setLocalError('');
            setFieldErrors((current) => ({
              ...current,
              fullName: text.trim().length >= 2 ? undefined : current.fullName,
            }));
          }}
          disabled={isLoading}
          error={fieldErrors.fullName}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => emailRef.current?.focus()}
          ref={fullNameRef}
          icon={<User size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.lg }}
        />

        <TextInput
          label="Email"
          placeholder="Nhập email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setLocalError('');
            setFieldErrors((current) => ({
              ...current,
              email: text.trim() && isValidEmail(text) ? undefined : current.email,
            }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => phoneRef.current?.focus()}
          disabled={isLoading}
          error={fieldErrors.email}
          ref={emailRef}
          icon={<Mail size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.lg }}
        />

        <TextInput
          label="Số điện thoại"
          placeholder="Nhập số điện thoại"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setLocalError('');
            setFieldErrors((current) => ({
              ...current,
              phone: text.trim().length >= 9 ? undefined : current.phone,
            }));
          }}
          keyboardType="phone-pad"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
          disabled={isLoading}
          error={fieldErrors.phone}
          ref={phoneRef}
          icon={<Phone size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.lg }}
        />

        <TextInput
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError('');
            setFieldErrors((current) => ({
              ...current,
              password: validatePassword(text) ? current.password : undefined,
              confirmPassword: confirmPassword && text === confirmPassword ? undefined : current.confirmPassword,
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
          disabled={isLoading}
          error={fieldErrors.password}
          ref={passwordRef}
          icon={<Lock size={20} color={colors.textSecondary} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} disabled={isLoading}>
              {showPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          }
          style={{ marginBottom: spacing.sm }}
        />

        <View style={{ marginBottom: spacing.lg }}>
          <PasswordRequirementCard password={password} />
        </View>

        <TextInput
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setLocalError('');
            setFieldErrors((current) => ({
              ...current,
              confirmPassword: text && text === password ? undefined : current.confirmPassword,
            }));
          }}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          contextMenuHidden
          disabled={isLoading}
          error={fieldErrors.confirmPassword}
          ref={confirmPasswordRef}
          icon={<Lock size={20} color={colors.textSecondary} />}
          rightIcon={
            <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)} disabled={isLoading}>
              {showConfirmPassword ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          }
        />
      </View>

      <Button
        label="Đăng ký"
        onPress={handleRegister}
        loading={isLoading}
        disabled={isLoading}
        style={{ marginBottom: spacing.lg }}
      />

      <View
        style={{
          padding: spacing.md,
          borderRadius: borderRadius.md,
          backgroundColor: colors.surfaceAlt,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.xs }}>
          Bạn muốn lái xe cùng Daigo?
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md }}>
          Tài xế xác minh số điện thoại trước, sau đó bổ sung hồ sơ xe và giấy tờ.
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/driver-register')} disabled={isLoading}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Đăng ký làm tài xế</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          Đã có tài khoản?
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} disabled={isLoading}>
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              fontWeight: '700',
            }}
          >
            Đăng nhập
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing['4xl'] }} />
    </Screen>
  );
}
