import { create } from 'zustand';
import { User } from '@/types';

interface ProfileStore {
  profile: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: User) => void;
  updateProfile: (updates: Partial<User>) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),

  updateProfile: (updates) => {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : null,
    }));
  },

  clearProfile: () => set({ profile: null }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
