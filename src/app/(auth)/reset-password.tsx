import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { toVietnameseAuthError, validatePassword } from '@/utils/authValidation';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { updatePassword, isLoading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const showError = (message: string) => {
    setLocalError(message);
    Alert.alert('Không thể cập nhật mật khẩu', message);
  };

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      showError('Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      await updatePassword(password);
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
        label="Mật khẩu mới"
        placeholder="Nhập mật khẩu mới"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setLocalError('');
        }}
        secureTextEntry={!showPassword}
        disabled={isLoading}
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
        style={{ marginBottom: spacing.lg }}
      />

      <TextInput
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setLocalError('');
        }}
        secureTextEntry={!showConfirmPassword}
        disabled={isLoading}
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
