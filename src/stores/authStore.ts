import { create } from 'zustand';
import { AuthCredentials, DriverOnboardingData, RegisterData, User } from '@/types';
import { apiClient } from '@/services/api';
import { toVietnameseAuthError } from '@/utils/authValidation';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True once the initial session-restore attempt has completed (success or not). */
  isSessionRestored: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<{ user: User; token: string }>;
  register: (data: RegisterData) => Promise<{ user: User; token: string }>;
  loginWithGoogle: (redirectTo: string) => Promise<{ user: User; token: string }>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string, profileData?: Partial<User>) => Promise<{ user: User; token: string }>;
  startDriverOnboarding: (data: DriverOnboardingData) => Promise<User>;
  resendSignupOtp: (email: string) => Promise<void>;
  verifySignupOtp: (email: string, token: string) => Promise<{ user: User; token: string }>;
  resetPassword: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  restoreSession: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  isSessionRestored: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Đăng nhập không thành công', isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.register(data);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: !!response.token,
        isLoading: false,
      });
      return response;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Đăng ký không thành công', isLoading: false });
      throw error;
    }
  },

  loginWithGoogle: async (redirectTo) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.loginWithGoogle(redirectTo);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Đăng nhập Google không thành công', isLoading: false });
      throw error;
    }
  },

  sendPhoneOtp: async (phone) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.sendPhoneOtp(phone);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Không thể gửi OTP điện thoại', isLoading: false });
      throw error;
    }
  },

  verifyPhoneOtp: async (phone, token, profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.verifyPhoneOtp(phone, token, profileData);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'OTP điện thoại không hợp lệ', isLoading: false });
      throw error;
    }
  },

  startDriverOnboarding: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await apiClient.startDriverOnboarding(data);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return user;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Không thể cập nhật hồ sơ tài xế', isLoading: false });
      throw error;
    }
  },

  resendSignupOtp: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.resendSignupOtp(email);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Không thể gửi OTP', isLoading: false });
      throw error;
    }
  },

  verifySignupOtp: async (email, token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.verifySignupOtp(email, token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return response;
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'OTP không hợp lệ', isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email, redirectTo) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.resetPassword(email, redirectTo);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Không thể gửi email đặt lại mật khẩu', isLoading: false });
      throw error;
    }
  },

  updatePassword: async (password) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.updatePassword(password);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: toVietnameseAuthError(error.message) || 'Không thể cập nhật mật khẩu', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.id) {
      await apiClient.disablePushTokens(currentUser.id).catch(() => undefined);
    }
    await apiClient.logout();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  restoreSession: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false, isSessionRestored: true, error: null });
  },
}));
