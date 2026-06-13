import React, { useState } from 'react';
import { Alert, Image, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react-native';
import { UserRole } from '@/types';
import { isValidEmail, toVietnameseAuthError, validatePassword } from '@/utils/authValidation';
import { DAIGO_LOGO_URL } from '@/constants/branding';

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
  const [role, setRole] = useState<UserRole>('customer');
  const [localError, setLocalError] = useState('');

  const showError = (message: string) => {
    setLocalError(message);
    Alert.alert('Không thể đăng ký', message);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      showError('Vui lòng nhập đầy đủ họ tên, email, số điện thoại và mật khẩu.');
      return;
    }

    if (fullName.trim().length < 2) {
      showError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Email không đúng định dạng.');
      return;
    }

    if (phone.trim().length < 9) {
      showError('Số điện thoại không hợp lệ.');
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
      const response = await register({
        fullName,
        email,
        phone,
        password,
        confirmPassword,
        role,
      });
      if (response.token) {
        router.replace(response.user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/home');
      } else {
        Alert.alert('Xác thực email', 'Tài khoản đã được tạo. Vui lòng nhập mã OTP được gửi về email để kích hoạt tài khoản.');
        router.replace({
          pathname: '/(auth)/verify-email' as any,
          params: { email },
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
          source={{ uri: DAIGO_LOGO_URL }}
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
          }}
          disabled={isLoading}
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
          }}
          keyboardType="email-address"
          disabled={isLoading}
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
          }}
          keyboardType="phone-pad"
          disabled={isLoading}
          icon={<Phone size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.lg }}
        />

        <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.sm }}>
          Loại tài khoản
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { label: 'Khách hàng', value: 'customer' as const },
            { label: 'Tài xế', value: 'driver' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setRole(item.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: borderRadius.md,
                alignItems: 'center',
                backgroundColor: role === item.value ? colors.primary : colors.surfaceAlt,
              }}
            >
              <Text style={{ color: role === item.value ? 'white' : colors.text, fontWeight: '700' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
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
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
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
    </Screen>
  );
}
