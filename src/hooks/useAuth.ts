import { useAuthStore } from '@/stores/authStore';
import { useCallback } from 'react';
import { apiClient } from '@/services/api';
import { AuthCredentials, RegisterData } from '@/types';

export const useAuth = () => {
  const { user, token, isLoading, error, login: storeLogin, register: storeRegister, logout } = useAuthStore();

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      try {
        const response = await apiClient.login(credentials);
        useAuthStore.setState({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
        });
        return response;
      } catch (err: any) {
        useAuthStore.setState({ error: err.message });
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        const response = await apiClient.register(data);
        useAuthStore.setState({
          user: response.user,
          token: response.token,
          isAuthenticated: true,
        });
        return response;
      } catch (err: any) {
        useAuthStore.setState({ error: err.message });
        throw err;
      }
    },
    []
  );

  return {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  };
};
