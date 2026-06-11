import { create } from 'zustand';
import { User, AuthResponse, AuthCredentials } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  restoreSession: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // Mock authentication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock user data based on email
      const isMockCustomer =
        credentials.email === 'khachhang@gmail.com';
      const isMockDriver =
        credentials.email === 'taixe.nguyenxuandai@gmail.com';

      if (!isMockCustomer && !isMockDriver) {
        throw new Error('Email không tồn tại');
      }

      const mockUser: User = {
        id: isMockCustomer ? 'customer_1' : 'driver_1',
        fullName: isMockCustomer
          ? 'Nguyễn Minh Anh'
          : 'Nguyễn Xuân Đài',
        email: credentials.email,
        phone: isMockCustomer ? '0912345678' : '0907454517',
        avatarUrl: isMockCustomer
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        role: isMockCustomer ? 'customer' : 'driver',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockToken = 'mock_token_' + Math.random().toString(36).substr(2, 9);

      set({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Đăng nhập không thành công',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockToken = 'mock_token_' + Math.random().toString(36).substr(2, 9);

      set({
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Đăng ký không thành công',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  restoreSession: (user, token) => {
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },
}));
