import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';

export default function SplashScreen() {
  const { isAuthenticated, user } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        if (user?.role === 'customer') {
          router.replace('/(customer)/home');
        } else {
          router.replace('/(driver)/dashboard');
        }
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.role]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ color: 'white', fontSize: 36, fontWeight: 'bold' }}>VF7</Text>
      </View>
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 8,
        }}
      >
        VF7 Booking
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>
        Đặt xe cao cấp VinFast VF7
      </Text>
    </View>
  );
}
