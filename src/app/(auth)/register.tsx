import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Phone, Lock } from 'lucide-react-native';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, isLoading, error } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setLocalError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      await register({
        fullName,
        email,
        phone,
        password,
        confirmPassword,
      });
      router.replace('/(customer)/home');
    } catch (err: any) {
      setLocalError(err.message);
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

      <View style={{ marginBottom: spacing.lg }}>
        <TextInput
          label="Họ và tên"
          placeholder="Nhập họ và tên"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setLocalError('');
          }}
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
          }}
          secureTextEntry
          icon={<Lock size={20} color={colors.textSecondary} />}
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
          secureTextEntry
          icon={<Lock size={20} color={colors.textSecondary} />}
        />
      </View>

      <Button
        label="Đăng ký"
        onPress={handleRegister}
        loading={isLoading}
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
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
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
