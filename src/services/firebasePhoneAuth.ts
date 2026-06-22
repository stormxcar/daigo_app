import { supabase } from '@/services/supabase';

let confirmationResult: any = null;

const getNativeAuth = async () => {
  try {
    const authModule = await import('@react-native-firebase/auth');
    return authModule.default();
  } catch (error: any) {
    throw new Error(
      'Firebase Phone Auth cần development build/APK có native module. Expo Go không hỗ trợ xác thực SĐT bằng Firebase.'
    );
  }
};

export const firebasePhoneAuth = {
  async sendOtp(phoneNumber: string) {
    const auth = await getNativeAuth();
    confirmationResult = await auth.signInWithPhoneNumber(phoneNumber);
  },

  async confirmOtp(code: string) {
    if (!confirmationResult) {
      throw new Error('Vui lòng gửi OTP trước khi xác thực.');
    }

    const credential = await confirmationResult.confirm(code);
    const auth = await getNativeAuth();
    const phoneNumber = credential?.user?.phoneNumber || auth.currentUser?.phoneNumber;
    if (!phoneNumber) {
      throw new Error('Firebase đã xác thực OTP nhưng không trả về số điện thoại.');
    }

    return phoneNumber;
  },

  async updatePhoneVerificationInSupabase(phoneNumber: string) {
    const { error } = await supabase.rpc('mark_phone_verified', {
      p_phone: phoneNumber,
    });
    if (error) throw error;
  },

  async clearFirebaseSession() {
    try {
      const auth = await getNativeAuth();
      await auth.signOut();
    } catch {
      // Supabase remains the primary auth system; Firebase session cleanup is best-effort.
    } finally {
      confirmationResult = null;
    }
  },
};
