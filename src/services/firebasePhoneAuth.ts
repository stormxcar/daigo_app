import { supabase } from '@/services/supabase';

let confirmationResult: any = null;
const shouldLogPhoneAuth = () => process.env.EXPO_PUBLIC_ENV !== 'production' || __DEV__;

const getNativeAuth = async () => {
  try {
    const authModule = await import('@react-native-firebase/auth');
    return authModule.default();
  } catch (_error: any) {
    throw new Error(
      'Firebase Phone Auth cần development build/APK có native module. Expo Go không hỗ trợ xác thực SĐT bằng Firebase.'
    );
  }
};

export const firebasePhoneAuth = {
  async sendOtp(phoneNumber: string) {
    const auth = await getNativeAuth();
    try {
      confirmationResult = await auth.signInWithPhoneNumber(phoneNumber);
    } catch (error: any) {
      if (shouldLogPhoneAuth()) {
        console.warn('Firebase phone OTP send failed', {
          code: error?.code,
          message: error?.message,
          nativeErrorMessage: error?.nativeErrorMessage,
        });
      }
      const code = error?.code ? ` (${error.code})` : '';
      const message = String(error?.message ?? '');
      if (error?.code === 'auth/operation-not-allowed' && message.toLowerCase().includes('region enabled')) {
        throw new Error(
          `Không thể gửi OTP Firebase${code}: Firebase chưa bật vùng gửi SMS cho số điện thoại này. Hãy bật Phone provider và SMS region Việt Nam trong Firebase Console.`
        );
      }
      if (error?.code === 'auth/operation-not-allowed') {
        throw new Error(
          `Không thể gửi OTP Firebase${code}: Firebase Phone Authentication chưa được bật cho project này. Hãy bật Phone trong Authentication > Sign-in method.`
        );
      }
      if (error?.code === 'auth/billing-not' || message.includes('BILLING_NOT_ENABLED')) {
        throw new Error(
          `Không thể gửi OTP Firebase${code}: Firebase yêu cầu bật billing/Blaze để gửi SMS thật. Hãy dùng số điện thoại test trong Firebase Console hoặc bật OTP test nội bộ của app.`
        );
      }
      throw new Error(`Không thể gửi OTP Firebase${code}: ${message || 'Vui lòng kiểm tra Firebase Phone Authentication, SHA-1/SHA-256 và google-services.json.'}`);
    }
  },

  async confirmOtp(code: string) {
    if (!confirmationResult) {
      throw new Error('Vui lòng gửi OTP trước khi xác thực.');
    }

    let credential;
    try {
      credential = await confirmationResult.confirm(code);
    } catch (error: any) {
      if (shouldLogPhoneAuth()) {
        console.warn('Firebase phone OTP confirm failed', {
          code: error?.code,
          message: error?.message,
          nativeErrorMessage: error?.nativeErrorMessage,
        });
      }
      const codeLabel = error?.code ? ` (${error.code})` : '';
      throw new Error(`OTP Firebase không hợp lệ${codeLabel}: ${error?.message ?? 'Vui lòng thử lại.'}`);
    }
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
