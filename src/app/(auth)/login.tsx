import React, { useEffect, useState } from 'react';
import { Alert, Image, View, Text, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Button, TextInput } from '@/components/BaseComponents';
import { useAuth } from '@/hooks/useAuth';
import { Check, Eye, EyeOff, Lock, Mail, Square } from 'lucide-react-native';
import { isValidEmail, toVietnameseAuthError } from '@/utils/authValidation';
import { DAIGO_LOGO_URL, APP_TAGLINE } from '@/constants/branding';

const REMEMBER_EMAIL_KEY = 'booking_daigo_remember_email';
const REMEMBER_PASSWORD_KEY = 'booking_daigo_remember_password';

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, loginWithGoogle, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    const loadRememberedLogin = async () => {
      const rememberedEmail = await SecureStore.getItemAsync(REMEMBER_EMAIL_KEY);
      const rememberedPassword = await SecureStore.getItemAsync(REMEMBER_PASSWORD_KEY);
      if (rememberedEmail && rememberedPassword) {
        setEmail(rememberedEmail);
        setPassword(rememberedPassword);
        setRememberLogin(true);
      }
    };

    loadRememberedLogin();
  }, []);

  const showError = (message: string) => {
    setLocalError(message);
    Alert.alert('Không thể đăng nhập', message);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('Email không đúng định dạng.');
      return;
    }

    try {
      const response = await login({ email, password });
      if (rememberLogin) {
        await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, email);
        await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, password);
      } else {
        await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
        await SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY);
      }
      router.replace(
        response.user.role === 'customer'
          ? '/(customer)/home'
          : '/(driver)/dashboard'
      );
    } catch (err: any) {
      showError(toVietnameseAuthError(err.message));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await loginWithGoogle(Linking.createURL('/(customer)/home'));
      router.replace(response.user.role === 'customer' ? '/(customer)/home' : '/(driver)/dashboard');
    } catch (err: any) {
      showError(toVietnameseAuthError(err.message));
    }
  };

  return (
    <Screen scroll padding>
      {/* ─── LOGO + TAGLINE HEADER (Uber pattern) ─── */}
      <View
        style={{
          alignItems: 'center',
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          marginBottom: spacing.lg,
        }}
      >
        <Image
          source={{ uri: DAIGO_LOGO_URL }}
          style={{
            width: 160,
            height: 72,
            resizeMode: 'contain',
            marginBottom: spacing.md,
          }}
        />
        <Text
          style={{
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            fontWeight: '500',
            letterSpacing: 0.5,
          }}
        >
          {APP_TAGLINE}
        </Text>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.text,
          marginBottom: spacing.xs,
        }}
      >
        Đăng nhập
      </Text>
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xl,
        }}
      >
        Chào mừng trở lại!
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
          label="Email"
          placeholder="Nhập email của bạn"
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
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xl,
        }}
      >
        <TouchableOpacity
          onPress={() => setRememberLogin((value) => !value)}
          disabled={isLoading}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: borderRadius.sm,
              borderWidth: 1,
              borderColor: rememberLogin ? colors.primary : colors.border,
              backgroundColor: rememberLogin ? colors.primary : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {rememberLogin ? <Check size={16} color="white" /> : <Square size={14} color="transparent" />}
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '600' }}>
            Ghi nhớ đăng nhập
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          disabled={isLoading}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: fontSize.sm,
              fontWeight: '600',
            }}
          >
            Quên mật khẩu?
          </Text>
        </TouchableOpacity>
      </View>

      <Button
        label="Đăng nhập"
        onPress={handleLogin}
        loading={isLoading}
        style={{ marginBottom: spacing.lg }}
      />

      <Button
        label="Đăng nhập với Google"
        onPress={handleGoogleLogin}
        variant="outline"
        loading={isLoading}
        disabled={isLoading}
        style={{ marginBottom: spacing.md }}
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
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} disabled={isLoading}>
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

    </Screen>
  );
}
