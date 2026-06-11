import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, isLoading, error } = useAuth();

  const [email, setEmail] = useState('khachhang@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setLocalError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const response = await login({ email, password });
      router.replace(
        response.user.role === 'customer'
          ? '/(customer)/home'
          : '/(driver)/dashboard'
      );
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
          label="Email"
          placeholder="Nhập email của bạn"
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
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setLocalError('');
          }}
          secureTextEntry={!showPassword}
          icon={<Lock size={20} color={colors.textSecondary} />}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/forgot-password')}
        style={{ marginBottom: spacing.xl }}
      >
        <Text
          style={{
            color: colors.primary,
            fontSize: fontSize.sm,
            fontWeight: '600',
            textAlign: 'right',
          }}
        >
          Quên mật khẩu?
        </Text>
      </TouchableOpacity>

      <Button
        label="Đăng nhập"
        onPress={handleLogin}
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
          Chưa có tài khoản?
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              fontWeight: '700',
            }}
          >
            Đăng ký
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          marginVertical: spacing.xl,
          paddingVertical: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.xs,
            textAlign: 'center',
            marginBottom: spacing.md,
          }}
        >
          TÀI KHOẢN DEMO
        </Text>
        <Button
          label="Khách hàng Demo"
          onPress={() => {
            setEmail('khachhang@gmail.com');
            setPassword('password123');
          }}
          variant="outline"
          size="sm"
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          label="Tài xế Demo"
          onPress={() => {
            setEmail('taixe.nguyenxuandai@gmail.com');
            setPassword('tai-xe-quan-tri-7');
          }}
          variant="outline"
          size="sm"
        />
      </View>
    </Screen>
  );
}
