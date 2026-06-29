export const normalizeVietnamPhone = (value: string) => {
  const cleaned = value.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('84')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+84${cleaned.slice(1)}`;
  return `+84${cleaned}`;
};

export const isValidVietnamPhone = (value: string) =>
  /^\+84\d{9,10}$/.test(normalizeVietnamPhone(value));

export const TEST_PHONE_OTP = '123456';

export const isTestPhoneOtpEnabled = () =>
  process.env.EXPO_PUBLIC_ENABLE_TEST_PHONE_OTP === 'true';

export const isFirebasePhoneAuthEnabled = () =>
  process.env.EXPO_PUBLIC_PHONE_AUTH_PROVIDER === 'firebase';
