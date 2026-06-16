import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { showError, showSuccess } from '@/utils/toast';

export default function AuthCallbackScreen() {
  useEffect(() => {
    const finish = async () => {
      try {
        const user = await apiClient.getCurrentUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        useAuthStore.getState().restoreSession(user, useAuthStore.getState().token ?? '');
        showSuccess('Đăng nhập thành công', 'Bạn đã quay lại ứng dụng.');
        router.replace(user.role === 'driver' ? '/(driver)/dashboard' : '/(customer)/home');
      } catch (error: any) {
        showError('Không thể hoàn tất đăng nhập', error.message);
        router.replace('/(auth)/login');
      }
    };

    finish();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
