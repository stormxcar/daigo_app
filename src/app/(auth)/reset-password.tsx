import React, { useRef, useState } from 'react';
import { Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { PasswordRequirementCard } from '@/components/PasswordRequirementCard';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { toVietnameseAuthError, validatePassword } from '@/utils/authValidation';
import { showError as showErrorToast, showSuccess, showWarning } from '@/utils/toast';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { updatePassword, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);

  const showError = (message: string) => {
    setLocalError(message);
    showErrorToast('Không thể cập nhật mật khẩu', message);
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
      showError('Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldErrors((current) => ({ ...current, password: passwordError }));
      passwordRef.current?.focus();
      showError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors((current) => ({ ...current, confirmPassword: 'Mật khẩu xác nhận không khớp.' }));
      confirmPasswordRef.current?.focus();
      showError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      await updatePassword(password);
      showSuccess('Đã cập nhật mật khẩu', 'Bạn có thể đăng nhập bằng mật khẩu mới.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      showError(toVietnameseAuthError(err.message));
    }
  };

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

      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
        Tạo mật khẩu mới
      </Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg }}>
        Nhập mật khẩu mới cho tài khoản của bạn.
      </Text>

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
        disabled={isLoading}
        error={fieldErrors.password}
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
        disabled={isLoading}
        error={fieldErrors.confirmPassword}
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
        style={{ marginBottom: spacing.lg }}
      />

      <Button label="Cập nhật mật khẩu" onPress={handleUpdatePassword} loading={isLoading} disabled={isLoading} />
    </Screen>
  );
}
