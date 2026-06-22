import React from 'react';
import { Stack } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options }: { options: { title?: string } }) => (
          <AppHeader
            title={options.title}
            showBack
            showNotifications={false}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="splash" 
        options={{
          animation: 'none',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="login" 
        options={{
          title: 'Đăng nhập',
        }}
      />
      <Stack.Screen 
        name="register" 
        options={{
          title: 'Đăng ký',
        }}
      />
      <Stack.Screen 
        name="phone-otp" 
        options={{
          title: 'Xác minh điện thoại',
        }}
      />
      <Stack.Screen 
        name="driver-register" 
        options={{
          title: 'Đăng ký tài xế',
        }}
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{
          title: 'Quên mật khẩu',
        }}
      />
    </Stack>
  );
}
