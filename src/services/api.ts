import * as WebBrowser from 'expo-web-browser';
import { AuthCredentials, AuthResponse, BlogComment, BlogPost, Booking, BookingDispatch, ChatConversation, DriverOnboardingData, DriverStatus, Message, NotificationItem, ProfileSettings, RatingReview, RegisterData, SavedLocation, User, Vehicle } from '@/types';
import { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } from '@/constants';
import { supabase } from './supabase';
import { getAuthRedirectUri } from '@/utils/authRedirect';
import { firebasePhoneAuth } from './firebasePhoneAuth';

WebBrowser.maybeCompleteAuthSession();

type VehicleRow = {
  id: string;
  driver_id: string | null;
  name: string;
  brand: string;
  license_plate: string;
  color: string;
  seats: number;
  price_per_km: number;
  status: Vehicle['status'];
  image: string;
  image_urls?: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    phone: string;
    avatar_url: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  address: string;
  bank_name?: string | null;
  bank_code?: string | null;
  bank_bin?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  email_verified: boolean;
  phone_verified?: boolean | null;
  phone_verified_at?: string | null;
  account_type?: User['accountType'] | null;
  driver_onboarding_status?: User['driverOnboardingStatus'] | null;
  kyc_status?: User['kycStatus'] | null;
  role: User['role'];
  created_at: string;
  updated_at: string;
};

type DriverRow = {
  id: string;
  profile_id: string;
  is_online: boolean;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rating: number;
  current_latitude: number | null;
  current_longitude: number | null;
  updated_location_at: string | null;
  cccd_number?: string | null;
  license_number?: string | null;
  document_urls?: string[] | null;
};

type ProfileSettingsRow = {
  user_id: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  location_sharing_enabled: boolean;
  has_seen_app_tour: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseResult<T> = {
  data: T | null;
  error: any;
};

const mapProfile = (row: ProfileRow): User => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url ?? undefined,
  address: row.address ?? '',
  bankName: row.bank_name ?? undefined,
  bankCode: row.bank_code ?? undefined,
  bankBin: row.bank_bin ?? undefined,
  bankAccountNumber: row.bank_account_number ?? undefined,
  bankAccountHolder: row.bank_account_holder ?? undefined,
  emailVerified: row.email_verified,
  phoneVerified: !!row.phone_verified,
  phoneVerifiedAt: row.phone_verified_at ?? undefined,
  accountType: row.account_type ?? row.role,
  driverOnboardingStatus: row.driver_onboarding_status ?? 'incomplete',
  kycStatus: row.kyc_status ?? 'incomplete',
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapVehicle = (row: VehicleRow): Vehicle => ({
  id: row.id,
  driverId: row.driver_id ?? undefined,
  driverName: row.profiles?.full_name ?? undefined,
  driverPhone: row.profiles?.phone ?? undefined,
  driverAvatar: row.profiles?.avatar_url ?? undefined,
  name: row.name,
  brand: row.brand,
  licensePlate: row.license_plate,
  color: row.color,
  seats: row.seats,
  pricePerKm: row.price_per_km,
  status: row.status,
  image: row.image,
  imageUrls: row.image_urls?.length ? row.image_urls : row.image ? [row.image] : [],
  description: row.description ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBooking = (row: any): Booking => {
  const vehicle = row.vehicles ? mapVehicle(row.vehicles) : undefined;
  const customer = row.customer as ProfileRow | null;
  const driver = row.driver as ProfileRow | null;

  return {
    id: row.id,
    bookingCode: row.booking_code ?? undefined,
    customerId: row.customer_id,
    customerName: customer?.full_name ?? '',
    customerPhone: customer?.phone ?? '',
    customerEmail: customer?.email ?? '',
    pickupLocation: row.pickup_location,
    pickupLat: row.pickup_lat ?? undefined,
    pickupLng: row.pickup_lng ?? undefined,
    dropoffLocation: row.dropoff_location,
    dropoffLat: row.dropoff_lat ?? undefined,
    dropoffLng: row.dropoff_lng ?? undefined,
    date: row.booking_date,
    time: String(row.booking_time).slice(0, 5),
    bookingMode: row.booking_mode ?? 'instant',
    scheduledStartAt: row.scheduled_start_at ?? undefined,
    scheduledEndAt: row.scheduled_end_at ?? undefined,
    scheduledStatus: row.scheduled_status ?? undefined,
    estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
    bufferBeforeMinutes: row.buffer_before_minutes ?? undefined,
    bufferAfterMinutes: row.buffer_after_minutes ?? undefined,
    scheduledResponseDeadlineAt: row.scheduled_response_deadline_at ?? undefined,
    reminderSentAt: row.reminder_sent_at ?? undefined,
    passengers: row.passengers,
    note: row.note ?? undefined,
    vehicleId: row.vehicle_id,
    vehicle,
    driverId: row.driver_id ?? '',
    driverName: driver?.full_name ?? 'Đang chờ tài xế',
    driverPhone: driver?.phone ?? '',
    estimatedPrice: row.estimated_price,
    actualPrice: row.actual_price ?? undefined,
    paymentStatus: row.payment_status ?? 'unpaid',
    paymentMethod: row.payment_method ?? undefined,
    distance: row.distance ? Number(row.distance) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    locked: row.locked ?? false,
    acceptedAt: row.accepted_at ?? undefined,
    arrivingAt: row.arriving_at ?? undefined,
    arrivedAt: row.arrived_at ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
  } as Booking;
};

const mapBlogPost = (row: any): BlogPost => ({
  id: row.id,
  driverId: row.driver_id,
  driverName: row.profiles?.full_name ?? 'Tài xế',
  driverAvatar: row.profiles?.avatar_url ?? undefined,
  caption: row.caption,
  mediaUrls: row.media_urls,
  mediaTypes: row.media_types,
  likes: row.likes,
  comments: row.comments,
  shares: row.shares,
  liked: !!row.blog_likes?.length,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRating = (row: any): RatingReview => ({
  id: row.id,
  bookingId: row.booking_id,
  fromUserId: row.from_user_id,
  toUserId: row.to_user_id,
  rating: row.rating,
  comment: row.comment ?? undefined,
  createdAt: row.created_at,
});

const mapSavedLocation = (row: any): SavedLocation => ({
  id: row.id,
  userId: row.user_id,
  label: row.label,
  address: row.address,
  lat: row.latitude ?? undefined,
  lng: row.longitude ?? undefined,
  type: row.location_type,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBookingDispatch = (row: any): BookingDispatch => ({
  id: row.id,
  bookingId: row.booking_id,
  driverId: row.driver_id,
  status: row.status,
  attempt: row.attempt,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  respondedAt: row.responded_at ?? undefined,
  booking: row.booking ? mapBooking(row.booking) : undefined,
});

const mapProfileSettings = (row: ProfileSettingsRow): ProfileSettings => ({
  userId: row.user_id,
  pushEnabled: row.push_enabled,
  smsEnabled: row.sms_enabled,
  locationSharingEnabled: row.location_sharing_enabled,
  hasSeenAppTour: row.has_seen_app_tour ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDriverStatus = (row: DriverRow): DriverStatus => ({
  id: row.id,
  profileId: row.profile_id,
  isOnline: row.is_online,
  verificationStatus: row.verification_status,
  rating: row.rating,
  currentLatitude: row.current_latitude ?? undefined,
  currentLongitude: row.current_longitude ?? undefined,
  updatedLocationAt: row.updated_location_at ?? undefined,
  cccdNumber: row.cccd_number ?? undefined,
  licenseNumber: row.license_number ?? undefined,
  documentUrls: row.document_urls ?? [],
});

export const normalizeVietnamPhone = (value: string) => {
  const cleaned = value.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('84')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+84${cleaned.slice(1)}`;
  return `+84${cleaned}`;
};

export const isValidVietnamPhone = (value: string) => /^\+84\d{9,10}$/.test(normalizeVietnamPhone(value));
export const TEST_PHONE_OTP = '123456';
export const isTestPhoneOtpEnabled = () =>
  process.env.EXPO_PUBLIC_ENABLE_TEST_PHONE_OTP === 'true';
export const isFirebasePhoneAuthEnabled = () => process.env.EXPO_PUBLIC_PHONE_AUTH_PROVIDER === 'firebase';

const API_CACHE_TTL_MS = 45_000;
const CUSTOMER_CANCELLABLE_STATUSES = [
  BOOKING_STATUS.SEARCHING_DRIVER,
  BOOKING_STATUS.SCHEDULED_PENDING_DRIVER,
  BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
  BOOKING_STATUS.SCHEDULED_UPCOMING,
  BOOKING_STATUS.DRIVER_ACCEPTED,
  BOOKING_STATUS.DRIVER_ARRIVING,
  BOOKING_STATUS.DRIVER_ARRIVED,
] as const;
const DRIVER_CANCELLABLE_STATUSES = [
  BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
  BOOKING_STATUS.SCHEDULED_UPCOMING,
  BOOKING_STATUS.DRIVER_ACCEPTED,
  BOOKING_STATUS.DRIVER_ARRIVING,
  BOOKING_STATUS.DRIVER_ARRIVED,
] as const;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

class ApiClient {
  private cache = new Map<string, CacheEntry<unknown>>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached<T>(key: string, data: T, ttlMs = API_CACHE_TTL_MS): T {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  private invalidateCache(prefix: string) {
    Array.from(this.cache.keys())
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.cache.delete(key));
  }

  private async withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Kết nối quá lâu. Vui lòng kiểm tra mạng và thử lại.')), timeoutMs);
    });

    try {
      return await Promise.race([Promise.resolve(promise), timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private isRetryableError(error: any) {
    const status = error?.status || error?.code;
    if (typeof status === 'number' && status >= 400 && status < 500) return false;
    const message = String(error?.message ?? '').toLowerCase();
    return message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('quá lâu');
  }

  private async runQuery<T>(
    operation: () => PromiseLike<SupabaseResult<T>>,
    options?: { timeoutMs?: number; retries?: number }
  ): Promise<T> {
    const retries = options?.retries ?? 1;
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const { data, error } = await this.withTimeout(operation(), options?.timeoutMs ?? 15000);
        if (error) throw error;
        return data as T;
      } catch (error: any) {
        lastError = error;
        if (attempt >= retries || !this.isRetryableError(error)) break;
      }
    }

    throw lastError;
  }

  private async getAuthResponseFromCurrentSession(fallbackMessage: string): Promise<AuthResponse> {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = await this.ensureCurrentUserProfile();
    if (!user || !sessionData.session) throw new Error(fallbackMessage);

    return { token: sessionData.session.access_token, user };
  }

  private async ensureCurrentUserProfile(overrides?: Partial<User>): Promise<User | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (existingError) throw existingError;

    const fullName =
      overrides?.fullName ||
      existing?.full_name ||
      (authUser.user_metadata?.full_name as string | undefined) ||
      (authUser.email ? authUser.email.split('@')[0] : '') ||
      authUser.phone ||
      'Người dùng Daigo';
    const phone = normalizeVietnamPhone(overrides?.phone || existing?.phone || authUser.phone || '');
    const email = overrides?.email || existing?.email || authUser.email || '';
    const avatarUrl =
      overrides?.avatarUrl ||
      existing?.avatar_url ||
      (authUser.user_metadata?.avatar_url as string | undefined) ||
      undefined;

    const payload: Record<string, string> = {
      id: authUser.id,
      full_name: fullName,
      email,
      phone,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) {
      payload.avatar_url = avatarUrl;
    }

    if (!existing) {
      const { data, error } = await supabase
        .from('profiles')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfile(data as ProfileRow);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', authUser.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapProfile(data as ProfileRow);
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return this.ensureCurrentUserProfile();
    return mapProfile(data as ProfileRow);
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;

    const user = await this.ensureCurrentUserProfile();
    if (!user || !data.session) throw new Error('Không tìm thấy hồ sơ người dùng');

    return { token: data.session.access_token, user };
  }

  async loginWithGoogle(redirectTo: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Không thể mở đăng nhập Google');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      const existingSession = await supabase.auth.getSession();
      if (existingSession.data.session) {
        return this.getAuthResponseFromCurrentSession('Không tìm thấy phiên đăng nhập Google');
      }
      throw new Error('Đăng nhập Google đã bị hủy');
    }

    const url = new URL(result.url);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const code = url.searchParams.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        const session = await supabase.auth.getSession();
        if (!session.data.session) throw exchangeError;
      }
    } else if (hashParams.get('access_token') && hashParams.get('refresh_token')) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: hashParams.get('access_token') ?? '',
        refresh_token: hashParams.get('refresh_token') ?? '',
      });
      if (sessionError) {
        const session = await supabase.auth.getSession();
        if (!session.data.session) throw sessionError;
      }
    }

    return this.getAuthResponseFromCurrentSession('Không tìm thấy phiên đăng nhập Google');
  }

  async resendSignupOtp(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  }

  async verifySignupOtp(email: string, token: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;

    const user = await this.ensureCurrentUserProfile();
    if (!user || !data.session) throw new Error('Không tìm thấy hồ sơ người dùng');

    return { token: data.session.access_token, user };
  }

  async resetPassword(email: string, redirectTo?: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }

  async verifyRecoveryOtp(email: string, token: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;

    const user = await this.ensureCurrentUserProfile();
    if (!user || !data.session) throw new Error('Không tìm thấy phiên đặt lại mật khẩu');

    return { token: data.session.access_token, user };
  }

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async sendPhoneOtp(phone: string) {
    const normalizedPhone = normalizeVietnamPhone(phone);
    if (!isValidVietnamPhone(normalizedPhone)) {
      throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.');
    }

    if (isFirebasePhoneAuthEnabled()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vui lòng đăng nhập bằng Email hoặc Google trước khi xác minh SĐT.');
      }
      await firebasePhoneAuth.sendOtp(normalizedPhone);
      return;
    }

    if (isTestPhoneOtpEnabled()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('OTP test chỉ dùng sau khi bạn đăng nhập bằng Email hoặc Google.');
      }
      return;
    }

    throw new Error(
      'Phone OTP chưa được cấu hình. Hãy bật EXPO_PUBLIC_PHONE_AUTH_PROVIDER=firebase cho APK/dev build, hoặc bật EXPO_PUBLIC_ENABLE_TEST_PHONE_OTP=true để test nội bộ.'
    );
  }

  async verifyPhoneOtp(phone: string, token: string, _profileData?: Partial<User>): Promise<AuthResponse> {
    const normalizedPhone = normalizeVietnamPhone(phone);
    const cleanToken = token.trim();
    if (!isValidVietnamPhone(normalizedPhone)) {
      throw new Error('Số điện thoại không hợp lệ.');
    }
    if (!/^\d{6}$/.test(cleanToken)) {
      throw new Error('Mã OTP phải gồm 6 chữ số.');
    }

    if (isFirebasePhoneAuthEnabled()) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Vui lòng đăng nhập bằng Email hoặc Google trước khi xác minh SĐT.');
      }
      const verifiedPhone = await firebasePhoneAuth.confirmOtp(cleanToken);
      await firebasePhoneAuth.updatePhoneVerificationInSupabase(verifiedPhone);
      await firebasePhoneAuth.clearFirebaseSession();
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Không tìm thấy hồ sơ sau khi xác minh SĐT.');
      return { token: sessionData.session.access_token, user };
    }

    if (isTestPhoneOtpEnabled()) {
      if (cleanToken !== TEST_PHONE_OTP) {
        throw new Error('Mã OTP test không hợp lệ.');
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('OTP test chỉ dùng sau khi bạn đăng nhập bằng Email hoặc Google.');
      }
      const { data, error } = await supabase.rpc('verify_test_phone_otp', {
        p_phone: normalizedPhone,
        p_token: cleanToken,
      });
      if (error) throw error;
      const user = mapProfile(data as ProfileRow);
      return { token: sessionData.session.access_token, user };
    }

    throw new Error(
      'Phone OTP chưa được cấu hình. Hãy dùng Firebase Phone Auth hoặc OTP test nội bộ trước khi xác minh SĐT.'
    );
  }

  async startDriverOnboarding(data: DriverOnboardingData): Promise<User> {
    const { data: profile, error } = await supabase.rpc('start_driver_onboarding', {
      p_full_name: data.fullName,
      p_email: data.email ?? null,
      p_avatar_url: data.avatarUrl ?? null,
      p_cccd_number: data.cccdNumber ?? null,
      p_license_number: data.licenseNumber ?? null,
      p_document_urls: data.documentUrls ?? [],
    });
    if (error) throw error;
    return mapProfile(profile as ProfileRow);
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: getAuthRedirectUri(),
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: 'customer',
        },
      },
    });
    if (error) throw error;

    if (!signUpData.session) {
      return {
        token: '',
        user: {
          id: signUpData.user?.id ?? '',
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: 'customer',
          accountType: 'customer',
          phoneVerified: false,
          driverOnboardingStatus: 'incomplete',
          kycStatus: 'incomplete',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const user = await this.ensureCurrentUserProfile({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
    });
    if (!user) throw new Error('Không tìm thấy hồ sơ người dùng');
    return { token: signUpData.session.access_token, user };
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: data.phone,
        address: data.address,
        avatar_url: data.avatarUrl,
        bank_name: data.bankName,
        bank_code: data.bankCode,
        bank_bin: data.bankBin,
        bank_account_number: data.bankAccountNumber,
        bank_account_holder: data.bankAccountHolder,
      })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return mapProfile(updated as ProfileRow);
  }

  async getProfileSettings(userId: string): Promise<ProfileSettings> {
    const data = await this.runQuery<any>(() =>
      supabase
        .from('profile_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    );

    if (data) return mapProfileSettings(data as ProfileSettingsRow);

    const inserted = await this.runQuery<any>(() =>
      supabase
        .from('profile_settings')
        .insert({ user_id: userId })
        .select('*')
        .single()
    );
    return mapProfileSettings(inserted as ProfileSettingsRow);
  }

  async updateProfileSettings(userId: string, data: Partial<ProfileSettings>): Promise<ProfileSettings> {
    const updated = await this.runQuery<any>(() =>
      supabase
        .from('profile_settings')
        .upsert(
          {
            user_id: userId,
            push_enabled: data.pushEnabled,
            sms_enabled: data.smsEnabled,
            location_sharing_enabled: data.locationSharingEnabled,
            has_seen_app_tour: data.hasSeenAppTour,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select('*')
        .single()
    );
    return mapProfileSettings(updated as ProfileSettingsRow);
  }

  async upsertPushToken(userId: string, token: string, platform: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: ['ios', 'android', 'web'].includes(platform) ? platform : 'unknown',
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );
    if (error) throw error;
  }

  async disablePushTokens(userId: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
  }

  async sendPushNotification(data: {
    userId?: string;
    userIds?: string[];
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: data.userId,
        userIds: data.userIds,
        title: data.title,
        body: data.body,
        data: data.payload ?? {},
      },
    });
    if (error) throw error;
  }

  async getVehicles(): Promise<Vehicle[]> {
    const cached = this.getCached<Vehicle[]>('vehicles:all');
    if (cached) return cached;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*, profiles!vehicles_driver_id_fkey(full_name, phone, avatar_url)')
      .order('price_per_km', { ascending: true });

    if (error) throw error;
    return this.setCached('vehicles:all', (data as VehicleRow[]).map(mapVehicle));
  }

  async getDriverVehicles(driverId: string): Promise<Vehicle[]> {
    const cacheKey = `vehicles:driver:${driverId}`;
    const cached = this.getCached<Vehicle[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return this.setCached(cacheKey, (data as VehicleRow[]).map(mapVehicle));
  }

  async getDriverStatus(profileId: string): Promise<DriverStatus | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDriverStatus(data as DriverRow) : null;
  }

  async getOnlineDriverStatuses(): Promise<DriverStatus[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .eq('verification_status', 'APPROVED')
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)
      .order('updated_location_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapDriverStatus(row as DriverRow));
  }

  async setDriverOnline(profileId: string, isOnline: boolean, location?: { lat: number; lng: number }): Promise<DriverStatus> {
    const existing = await this.getDriverStatus(profileId);
    if (!existing) {
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          profile_id: profileId,
          is_online: isOnline,
          verification_status: 'PENDING',
          current_latitude: location?.lat,
          current_longitude: location?.lng,
          updated_location_at: location ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapDriverStatus(data as DriverRow);
    }

    if (isOnline && existing.verificationStatus !== 'APPROVED') {
      throw new Error('Bạn chưa được duyệt tài khoản tài xế.');
    }

    const { data, error } = await supabase
      .from('drivers')
      .update({
        is_online: isOnline,
        current_latitude: location?.lat ?? existing.currentLatitude,
        current_longitude: location?.lng ?? existing.currentLongitude,
        updated_location_at: location ? new Date().toISOString() : existing.updatedLocationAt,
      })
      .eq('profile_id', profileId)
      .select('*')
      .single();
    if (error) throw error;
    return mapDriverStatus(data as DriverRow);
  }

  async updateDriverDocuments(profileId: string, data: Pick<DriverOnboardingData, 'cccdNumber' | 'licenseNumber' | 'documentUrls'>): Promise<DriverStatus> {
    const existing = await this.getDriverStatus(profileId);
    const payload = {
      profile_id: profileId,
      cccd_number: data.cccdNumber?.trim() || null,
      license_number: data.licenseNumber?.trim() || null,
      document_urls: data.documentUrls ?? [],
      verification_status: existing?.verificationStatus ?? 'PENDING',
    };

    const { data: updated, error } = await supabase
      .from('drivers')
      .upsert(payload, { onConflict: 'profile_id' })
      .select('*')
      .single();
    if (error) throw error;
    return mapDriverStatus(updated as DriverRow);
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, profiles!vehicles_driver_id_fkey(full_name, phone, avatar_url)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapVehicle(data as VehicleRow);
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const { data: inserted, error } = await supabase
      .from('vehicles')
      .insert({
        name: data.name,
        driver_id: data.driverId,
        brand: data.brand,
        license_plate: data.licensePlate,
        color: data.color,
        seats: data.seats,
        price_per_km: data.pricePerKm,
        status: data.status ?? 'Sẵn sàng',
        image: data.image ?? '',
        image_urls: data.imageUrls ?? (data.image ? [data.image] : []),
        description: data.description,
      })
      .select('*')
      .single();
    if (error) throw error;
    this.invalidateCache('vehicles:');
    return mapVehicle(inserted as VehicleRow);
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    const { data: updated, error } = await supabase
      .from('vehicles')
      .update({
        name: data.name,
        driver_id: data.driverId,
        brand: data.brand,
        license_plate: data.licensePlate,
        color: data.color,
        seats: data.seats,
        price_per_km: data.pricePerKm,
        status: data.status,
        image: data.image,
        image_urls: data.imageUrls,
        description: data.description,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    this.invalidateCache('vehicles:');
    return mapVehicle(updated as VehicleRow);
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
    this.invalidateCache('vehicles:');
  }

  async getBookings(filters?: {
    status?: string;
    driverId?: string;
    customerId?: string;
    driverVisibleTo?: string;
    date?: string;
    time?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Booking[]> {
    let query = supabase
      .from('bookings')
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.driverId) query = query.eq('driver_id', filters.driverId);
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters?.date) query = query.eq('booking_date', filters.date);
    if (filters?.time) query = query.eq('booking_time', filters.time);
    if (filters?.driverVisibleTo) {
      query = query.or(
        `driver_id.eq.${filters.driverVisibleTo},and(driver_id.is.null,status.in.(${BOOKING_STATUS.SEARCHING_DRIVER},${BOOKING_STATUS.SCHEDULED_PENDING_DRIVER}))`
      );
    }
    if (filters?.page && filters?.pageSize) {
      const from = (filters.page - 1) * filters.pageSize;
      query = query.range(from, from + filters.pageSize - 1);
    }

    const data = await this.runQuery<any[]>(() => query, { retries: 1 });
    return (data ?? []).map(mapBooking);
  }

  async getDriverScheduledBookingsByMonth(driverId: string, monthDate: Date): Promise<Booking[]> {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('bookings')
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .eq('booking_mode', 'scheduled')
      .gte('booking_date', fromDate)
      .lte('booking_date', toDate)
      .or(`driver_id.eq.${driverId},and(driver_id.is.null,status.eq.${BOOKING_STATUS.SCHEDULED_PENDING_DRIVER})`)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapBooking);
  }

  async getBookingById(id: string): Promise<Booking> {
    const data = await this.runQuery<any>(() =>
      supabase
        .from('bookings')
        .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
        .eq('id', id)
        .single()
    );
    return mapBooking(data);
  }

  async getPendingBookingDispatches(driverId: string): Promise<BookingDispatch[]> {
    const data = await this.runQuery<any[]>(() =>
      supabase
        .from('booking_dispatches')
        .select('*, booking:bookings(*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*))')
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })
    );

    return (data ?? []).map(mapBookingDispatch);
  }

  async getActiveBooking(userId: string, role: User['role'] = 'customer'): Promise<Booking | null> {
    let query = supabase
      .from('bookings')
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .in('status', [...ACTIVE_BOOKING_STATUSES])
      .order('created_at', { ascending: false });

    query = role === 'driver' ? query.eq('driver_id', userId) : query.eq('customer_id', userId);

    const { data, error } = await query.limit(2);
    if (error) throw error;
    if ((data ?? []).length > 1 && __DEV__) {
      console.warn('Phát hiện nhiều active booking cho cùng user', { userId, role, count: data?.length });
    }
    return data?.[0] ? mapBooking(data[0]) : null;
  }

  async createBooking(data: Partial<Booking> & { pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number }): Promise<Booking> {
    if (!data.customerId) {
      throw new Error('Bạn cần đăng nhập để đặt xe.');
    }

    const activeBooking = await this.getActiveBooking(data.customerId, 'customer');
    if (activeBooking) {
      throw new Error('Bạn đang có một chuyến xe đang hoạt động. Vui lòng hoàn thành hoặc hủy chuyến hiện tại trước khi đặt chuyến mới.');
    }

    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: data.customerId,
        vehicle_id: data.vehicleId,
        driver_id: null,
        status: data.bookingMode === 'scheduled' ? BOOKING_STATUS.SCHEDULED_PENDING_DRIVER : BOOKING_STATUS.SEARCHING_DRIVER,
        booking_mode: data.bookingMode ?? 'instant',
        scheduled_start_at: data.scheduledStartAt,
        scheduled_end_at: data.scheduledEndAt,
        scheduled_status: data.bookingMode === 'scheduled' ? 'pending_driver' : null,
        estimated_duration_minutes: data.estimatedDurationMinutes ?? 90,
        buffer_before_minutes: data.bufferBeforeMinutes ?? 15,
        buffer_after_minutes: data.bufferAfterMinutes ?? 15,
        scheduled_response_deadline_at: data.scheduledResponseDeadlineAt,
        vehicle_type: data.vehicle?.name,
        pickup_location: data.pickupLocation,
        pickup_lat: data.pickupLat,
        pickup_lng: data.pickupLng,
        dropoff_location: data.dropoffLocation,
        dropoff_lat: data.dropoffLat,
        dropoff_lng: data.dropoffLng,
        booking_date: data.date,
        booking_time: data.time,
        passengers: data.passengers,
        note: data.note,
        estimated_price: data.estimatedPrice,
        distance: data.distance,
      })
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .single();
    if (error) throw error;

    await supabase
      .from('conversations')
      .upsert(
        {
          booking_id: inserted.id,
          customer_id: data.customerId,
          driver_id: null,
        },
        { onConflict: 'booking_id', ignoreDuplicates: true }
      );

    await this.createNotificationSafely({
      userId: data.customerId ?? '',
      title: data.bookingMode === 'scheduled' ? 'Đã tạo chuyến đặt trước' : 'Đã tạo chuyến, đang tìm tài xế',
      content: data.bookingMode === 'scheduled'
        ? 'Đã tạo chuyến đặt trước. Tài xế phù hợp sẽ phản hồi lịch của bạn.'
        : 'Đã tạo chuyến. Hệ thống đang tìm tài xế phù hợp.',
      type: 'booking_success',
      read: false,
      relatedBookingId: inserted.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });

    await this.notifyAvailableDriversForBooking(inserted.id);

    return mapBooking(inserted);
  }

  async notifyAvailableDriversForBooking(bookingId: string): Promise<number> {
    const { data, error } = await supabase.rpc('notify_available_drivers_for_booking', { p_booking_id: bookingId });
    if (error) {
      if (__DEV__) console.warn('Không thể gửi thông báo booking tới tài xế', error);
      return 0;
    }
    return Number(data ?? 0);
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update({
        status: data.status,
        driver_id: data.driverId || undefined,
        actual_price: data.actualPrice,
        note: data.note,
        locked: data.locked,
        arriving_at: data.arrivingAt,
        arrived_at: data.arrivedAt,
        started_at: data.startedAt,
        completed_at: data.completedAt,
        cancelled_at: data.cancelledAt,
        cancelled_by: data.cancelledBy,
        cancel_reason: data.cancelReason,
      })
      .eq('id', id)
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .single();
    if (error) throw error;
    return mapBooking(updated);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const bookingBefore = await this.getBookingById(id);
    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(bookingBefore.status as any)) {
      throw new Error('Không thể hủy chuyến ở trạng thái hiện tại.');
    }
    if (
      bookingBefore.bookingMode === 'scheduled' &&
      bookingBefore.scheduledStartAt &&
      Date.now() >= new Date(bookingBefore.scheduledStartAt).getTime()
    ) {
      throw new Error('Chuyến đặt trước đã đến giờ tài xế thao tác nên không thể hủy trong app. Vui lòng liên hệ tài xế hoặc hỗ trợ.');
    }

    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.CUSTOMER_CANCELLED,
      cancelledBy: 'CUSTOMER',
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
    });
    const receiverId = booking.driverId;
    if (receiverId) {
      await this.createNotificationSafely({
        userId: receiverId,
        title: 'Khách hàng đã hủy chuyến',
        content: `Chuyến đi từ ${booking.pickupLocation} đến ${booking.dropoffLocation} đã bị khách hàng hủy.${reason ? ` Lý do: ${reason}` : ''}`,
        type: 'booking_update',
        read: false,
        relatedBookingId: booking.id,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }
    return booking;
  }

  async completeBooking(id: string): Promise<Booking> {
    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.TRIP_COMPLETED,
      completedAt: new Date().toISOString(),
    });
    const { error: historyError } = await supabase.from('trip_history').insert({
      booking_id: booking.id,
      customer_id: booking.customerId,
      driver_id: booking.driverId || null,
      pickup_address: booking.pickupLocation,
      dropoff_address: booking.dropoffLocation,
      started_at: booking.startedAt,
      completed_at: booking.completedAt ?? new Date().toISOString(),
    });
    if (historyError && __DEV__) {
      console.warn('trip_history insert failed', historyError);
    }
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Chuyến đi đã hoàn thành',
      content: `Chuyến đi ${booking.bookingCode ?? ''} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ.`,
      type: 'trip_done',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async markDriverArriving(id: string): Promise<Booking> {
    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.DRIVER_ARRIVING,
      arrivingAt: new Date().toISOString(),
    });
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Tài xế đang tới',
      content: 'Tài xế đang di chuyển đến điểm đón.',
      type: 'booking_update',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async markDriverArrived(id: string): Promise<Booking> {
    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.DRIVER_ARRIVED,
      arrivedAt: new Date().toISOString(),
    });
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Tài xế đã đến điểm đón',
      content: 'Tài xế đã đến điểm đón. Vui lòng ra xe.',
      type: 'booking_update',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async startTrip(id: string): Promise<Booking> {
    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.TRIP_STARTED,
      startedAt: new Date().toISOString(),
    });
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Chuyến đi đã bắt đầu',
      content: 'Chuyến đi của bạn đã bắt đầu.',
      type: 'booking_update',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async cancelBookingByDriver(id: string, reason?: string): Promise<Booking> {
    const bookingBefore = await this.getBookingById(id);
    if (!DRIVER_CANCELLABLE_STATUSES.includes(bookingBefore.status as any)) {
      throw new Error('Không thể hủy chuyến ở trạng thái hiện tại.');
    }
    if (
      bookingBefore.bookingMode === 'scheduled' &&
      bookingBefore.scheduledStartAt &&
      Date.now() >= new Date(bookingBefore.scheduledStartAt).getTime()
    ) {
      throw new Error('Chuyến đặt trước đã đến giờ thao tác. Vui lòng cập nhật trạng thái chuyến thay vì hủy.');
    }

    const booking = await this.updateBooking(id, {
      status: BOOKING_STATUS.DRIVER_CANCELLED,
      cancelledBy: 'DRIVER',
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
    });
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Tài xế đã hủy chuyến',
      content: 'Tài xế đã hủy chuyến. Bạn có thể đặt lại chuyến mới.',
      type: 'driver_cancel',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async acceptBooking(id: string, driverId: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('accept_booking', { p_booking_id: id });
    if (error) throw error;
    const booking = await this.getBookingById(data.id);
    await supabase.from('conversations').update({ driver_id: driverId }).eq('booking_id', id);
    return booking;
  }

  async acceptScheduledBooking(id: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('accept_scheduled_booking', { p_booking_id: id });
    if (error) throw error;
    if (data?.driver_id) {
      await supabase.from('conversations').update({ driver_id: data.driver_id }).eq('booking_id', id);
    }
    return mapBooking(data);
  }

  async rejectScheduledBooking(id: string): Promise<Booking> {
    const { data, error } = await supabase.rpc('reject_scheduled_booking', { p_booking_id: id });
    if (error) throw error;
    return mapBooking(data);
  }

  async findAvailableScheduledDrivers(input: {
    startAt: string;
    endAt: string;
    pickupLat?: number;
    pickupLng?: number;
  }): Promise<Array<{ driverId: string; vehicleId: string }>> {
    const { data, error } = await supabase.rpc('find_available_drivers', {
      p_start_at: input.startAt,
      p_end_at: input.endAt,
      p_pickup_lat: input.pickupLat ?? null,
      p_pickup_lng: input.pickupLng ?? null,
    });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      driverId: row.driver_id,
      vehicleId: row.vehicle_id,
    }));
  }

  async acceptBookingDispatch(dispatch: BookingDispatch): Promise<Booking> {
    return this.acceptBooking(dispatch.bookingId, dispatch.driverId);
  }

  async rejectBookingDispatch(dispatchId: string): Promise<BookingDispatch> {
    const data = await this.runQuery<any>(() =>
      supabase.rpc('reject_booking_dispatch', { p_dispatch_id: dispatchId })
    );
    return mapBookingDispatch(data);
  }

  async timeoutBookingDispatch(dispatchId: string): Promise<BookingDispatch> {
    const data = await this.runQuery<any>(() =>
      supabase.rpc('timeout_booking_dispatch', { p_dispatch_id: dispatchId })
    );
    return mapBookingDispatch(data);
  }

  async getRatingForBooking(bookingId: string, fromUserId: string): Promise<RatingReview | null> {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('from_user_id', fromUserId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRating(data) : null;
  }

  async createRating(data: {
    bookingId: string;
    fromUserId: string;
    toUserId: string;
    rating: number;
    comment?: string;
  }): Promise<RatingReview> {
    const existing = await this.getRatingForBooking(data.bookingId, data.fromUserId);
    if (existing) {
      throw new Error('Bạn đã đánh giá chuyến đi này rồi.');
    }

    const { data: inserted, error } = await supabase
      .from('ratings')
      .insert({
        booking_id: data.bookingId,
        from_user_id: data.fromUserId,
        to_user_id: data.toUserId,
        rating: data.rating,
        comment: data.comment?.trim() || null,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('Bạn đã đánh giá chuyến đi này rồi.');
      }
      throw error;
    }
    this.invalidateCache(`ratings:user:${data.toUserId}`);
    return mapRating(inserted);
  }

  async getRatingsForUser(userId: string): Promise<RatingReview[]> {
    const cacheKey = `ratings:user:${userId}`;
    const cached = this.getCached<RatingReview[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return this.setCached(cacheKey, (data ?? []).map(mapRating));
  }

  async getSavedLocations(userId: string): Promise<SavedLocation[]> {
    const { data, error } = await supabase
      .from('saved_locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapSavedLocation);
  }

  async createSavedLocation(data: {
    userId: string;
    label: string;
    address: string;
    lat?: number;
    lng?: number;
    type?: SavedLocation['type'];
  }): Promise<SavedLocation> {
    const { data: inserted, error } = await supabase
      .from('saved_locations')
      .insert({
        user_id: data.userId,
        label: data.label.trim(),
        address: data.address.trim(),
        latitude: data.lat,
        longitude: data.lng,
        location_type: data.type ?? 'favorite',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapSavedLocation(inserted);
  }

  private mapNotification(row: any): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      time: new Date(row.created_at).toLocaleString('vi-VN'),
      type: row.type,
      read: row.read,
      relatedBookingId: row.related_booking_id ?? undefined,
      relatedPostId: row.related_post_id ?? undefined,
      createdAt: row.created_at,
    };
  }

  async getNotifications(userId: string): Promise<NotificationItem[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: any) => this.mapNotification(row));
  }

  async getNotificationsPage(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: NotificationItem[]; total: number; hasMore: boolean }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return {
      items: (data ?? []).map((row: any) => this.mapNotification(row)),
      total,
      hasMore: to + 1 < total,
    };
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    return count ?? 0;
  }

  async createNotification(data: Omit<NotificationItem, 'id'> & { id?: string }): Promise<NotificationItem> {
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        title: data.title,
        content: data.content,
        type: data.type,
        read: data.read,
        related_booking_id: data.relatedBookingId,
        related_post_id: data.relatedPostId,
      })
      .select('*')
      .single();
    if (error) throw error;
    const notification = {
      ...data,
      id: inserted.id,
      createdAt: inserted.created_at,
      time: new Date(inserted.created_at).toLocaleString('vi-VN'),
    };
    return notification;
  }

  async createNotificationSafely(data: Omit<NotificationItem, 'id'> & { id?: string }): Promise<NotificationItem | null> {
    try {
      return await this.createNotification(data);
    } catch (error) {
      if (__DEV__) console.warn('Không thể tạo thông báo phụ trợ', error);
      return null;
    }
  }

  async markNotificationAsRead(id: string): Promise<NotificationItem> {
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select('*').single();
    if (error) throw error;
    return {
      ...this.mapNotification(data),
    };
  }

  async markNotificationsAsRead(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', uniqueIds);
    if (error) throw error;
  }

  async getBlogPosts(page = 1, pageSize = 10, filters?: { driverId?: string }): Promise<BlogPost[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id ?? 'anonymous';
    const cacheKey = `blog:posts:${page}:${pageSize}:${filters?.driverId ?? 'all'}:${userId}`;
    const cached = this.getCached<BlogPost[]>(cacheKey);
    if (cached) return cached;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('blog_posts')
      .select('*, profiles!blog_posts_driver_id_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.driverId) query = query.eq('driver_id', filters.driverId);

    const { data, error } = await query;
    if (error) throw error;

    const posts = (data ?? []).map(mapBlogPost);
    if (!userId || userId === 'anonymous' || posts.length === 0) return this.setCached(cacheKey, posts);

    const { data: likes } = await supabase
      .from('blog_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', posts.map((post) => post.id));
    const likedIds = new Set((likes ?? []).map((item: any) => item.post_id));
    return this.setCached(cacheKey, posts.map((post) => ({ ...post, liked: likedIds.has(post.id) })));
  }

  async getBlogPostById(id: string): Promise<BlogPost> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, profiles!blog_posts_driver_id_fkey(full_name, avatar_url)')
      .eq('id', id)
      .single();
    if (error) throw error;
    const post = mapBlogPost(data);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return post;
    const { data: like } = await supabase
      .from('blog_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    return { ...post, liked: !!like };
  }

  async createBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
    const { data: inserted, error } = await supabase
      .from('blog_posts')
      .insert({
        driver_id: data.driverId,
        caption: data.caption,
        media_urls: data.mediaUrls ?? [],
        media_types: data.mediaTypes ?? [],
      })
      .select('*, profiles!blog_posts_driver_id_fkey(full_name, avatar_url)')
      .single();
    if (error) throw error;
    this.invalidateCache('blog:');
    return mapBlogPost(inserted);
  }

  async updateBlogPost(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
    const { data: updated, error } = await supabase
      .from('blog_posts')
      .update({
        caption: data.caption,
        media_urls: data.mediaUrls,
        media_types: data.mediaTypes,
      })
      .eq('id', id)
      .select('*, profiles!blog_posts_driver_id_fkey(full_name, avatar_url)')
      .single();
    if (error) throw error;
    this.invalidateCache('blog:');
    return mapBlogPost(updated);
  }

  async deleteBlogPost(id: string): Promise<void> {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
    this.invalidateCache('blog:');
  }

  async toggleBlogLike(postId: string, userId: string): Promise<BlogPost> {
    const { data: existing } = await supabase
      .from('blog_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('blog_likes').delete().eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('blog_likes').insert({ post_id: postId, user_id: userId });
      if (error) throw error;

      const [{ data: post }, { data: actor }] = await Promise.all([
        supabase.from('blog_posts').select('driver_id, caption').eq('id', postId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      ]);
      if (post?.driver_id && post.driver_id !== userId) {
        await this.createNotificationSafely({
          userId: post.driver_id,
          title: 'Bài viết có lượt thích mới',
          content: `${actor?.full_name ?? 'Một người dùng'} đã thích bài viết của bạn.`,
          type: 'blog_interaction',
          read: false,
          relatedPostId: postId,
          createdAt: new Date().toISOString(),
          time: 'Vừa xong',
        });
      }
    }

    this.invalidateCache('blog:');
    return this.getBlogPostById(postId);
  }

  async getBlogComments(postId: string): Promise<BlogComment[]> {
    const { data, error } = await supabase
      .from('blog_comments')
      .select('*, profiles!blog_comments_author_id_fkey(full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      parentCommentId: row.parent_comment_id ?? undefined,
      authorId: row.author_id,
      authorName: row.profiles?.full_name ?? 'Người dùng',
      authorAvatar: row.profiles?.avatar_url ?? undefined,
      text: row.text,
      createdAt: row.created_at,
    }));
  }

  async createBlogComment(postId: string, authorId: string, text: string, parentCommentId?: string): Promise<BlogComment> {
    const { data, error } = await supabase
      .from('blog_comments')
      .insert({ post_id: postId, author_id: authorId, text, parent_comment_id: parentCommentId ?? null })
      .select('*, profiles!blog_comments_author_id_fkey(full_name, avatar_url)')
      .single();
    if (error) throw error;
    this.invalidateCache('blog:');

    const [{ data: post }, { data: parentComment }] = await Promise.all([
      supabase.from('blog_posts').select('driver_id').eq('id', postId).maybeSingle(),
      parentCommentId
        ? supabase.from('blog_comments').select('author_id').eq('id', parentCommentId).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    const authorName = data.profiles?.full_name ?? 'Một người dùng';
    const receiverIds = Array.from(
      new Set(
        [post?.driver_id, parentComment?.author_id]
          .filter((id): id is string => Boolean(id))
          .filter((id) => id !== authorId)
      )
    );
    await Promise.all(
      receiverIds.map((receiverId) =>
        this.createNotificationSafely({
          userId: receiverId,
          title: parentCommentId ? 'Có phản hồi bình luận mới' : 'Bài viết có bình luận mới',
          content: `${authorName}: ${text.trim()}`,
          type: 'blog_interaction',
          read: false,
          relatedPostId: postId,
          createdAt: new Date().toISOString(),
          time: 'Vừa xong',
        })
      )
    );

    return {
      id: data.id,
      postId: data.post_id,
      parentCommentId: data.parent_comment_id ?? undefined,
      authorId: data.author_id,
      authorName: data.profiles?.full_name ?? 'Người dùng',
      authorAvatar: data.profiles?.avatar_url ?? undefined,
      text: data.text,
      createdAt: data.created_at,
    };
  }

  async shareBlogPost(postId: string, _userId: string): Promise<BlogPost> {
    return this.getBlogPostById(postId);
  }

  async getConversations(userId: string): Promise<ChatConversation[]> {
    const [{ data, error }, { data: hiddenData, error: hiddenError }] = await Promise.all([
      supabase
      .from('conversations')
      .select('*, customer:profiles!conversations_customer_id_fkey(*), driver:profiles!conversations_driver_id_fkey(*), messages(*, profiles!messages_sender_id_fkey(full_name, role), reply:messages!reply_to_message_id(text, sender_id, profiles!messages_sender_id_fkey(full_name)))')
      .or(`customer_id.eq.${userId},driver_id.eq.${userId}`)
        .order('updated_at', { ascending: false }),
      supabase
        .from('conversation_user_hidden')
        .select('conversation_id')
        .eq('user_id', userId),
    ]);
    if (error) throw error;
    if (hiddenError) throw hiddenError;

    const hiddenIds = new Set((hiddenData ?? []).map((item: any) => item.conversation_id));

    const conversations = (data ?? []).filter((row: any) => !hiddenIds.has(row.id)).map((row: any) => {
      const participant = row.customer_id === userId ? row.driver : row.customer;
      const messages = [...(row.messages ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const mappedMessages: Message[] = messages.map((message: any) => ({
        id: message.id,
        sender: message.sender_id === userId ? 'user' as const : 'driver' as const,
        senderName: message.profiles?.full_name ?? 'Người dùng',
        text: message.text,
        mediaUrl: message.media_url ?? undefined,
        mediaType: message.media_type ?? undefined,
        replyToMessageId: message.reply_to_message_id ?? undefined,
        replyToText: message.reply?.text ?? undefined,
        replyToSenderName: message.reply?.profiles?.full_name ?? undefined,
        timestamp: message.created_at,
        read: message.read,
      }));
      const lastMessage = mappedMessages[mappedMessages.length - 1];

      return {
        id: row.id,
        bookingId: row.booking_id ?? undefined,
        threadIds: [row.id],
        participantId: participant?.id ?? '',
        participantName: participant?.full_name ?? 'Tài xế sẽ xác nhận',
        participantPhone: participant?.phone ?? undefined,
        participantAvatar: participant?.avatar_url ?? undefined,
        lastMessage: lastMessage?.text ?? 'Chưa có tin nhắn',
        lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleString('vi-VN') : '',
        unreadCount: messages.filter((message: any) => !message.read && message.sender_id !== userId).length,
        messages: mappedMessages,
        isSummary: false,
        updatedAt: row.updated_at,
      };
    });

    const grouped = new Map<string, ChatConversation & { updatedAt?: string }>();
    conversations.forEach((conversation) => {
      const key = conversation.participantId || conversation.id;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, conversation);
        return;
      }

      const mergedMessages = [...existing.messages, ...conversation.messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const lastMessage = mergedMessages[mergedMessages.length - 1];
      const keepCurrentId =
        new Date(conversation.updatedAt ?? 0).getTime() >= new Date(existing.updatedAt ?? 0).getTime();

      grouped.set(key, {
        ...existing,
        id: keepCurrentId ? conversation.id : existing.id,
        bookingId: keepCurrentId ? conversation.bookingId : existing.bookingId,
        threadIds: Array.from(new Set([...(existing.threadIds ?? [existing.id]), ...(conversation.threadIds ?? [conversation.id])])),
        unreadCount: existing.unreadCount + conversation.unreadCount,
        messages: mergedMessages,
        lastMessage: lastMessage?.text ?? existing.lastMessage,
        lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleString('vi-VN') : existing.lastMessageTime,
        updatedAt: keepCurrentId ? conversation.updatedAt : existing.updatedAt,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .map(({ updatedAt: _updatedAt, ...conversation }) => conversation);
  }

  async getConversationSummaries(userId: string): Promise<ChatConversation[]> {
    const { data, error } = await supabase.rpc('get_conversation_summaries', {
      p_user_id: userId,
    });
    if (error) throw error;

    return (data ?? []).map((row: any) => {
      const lastMessageTime = row.last_message_time
        ? new Date(row.last_message_time).toLocaleString('vi-VN')
        : '';
      return {
        id: row.id,
        bookingId: row.booking_id ?? undefined,
        threadIds: row.thread_ids ?? [row.id],
        participantId: row.participant_id ?? '',
        participantName: row.participant_name ?? 'Tài xế sẽ xác nhận',
        participantPhone: row.participant_phone ?? undefined,
        participantAvatar: row.participant_avatar ?? undefined,
        lastMessage: row.last_message ?? 'Chưa có tin nhắn',
        lastMessageTime,
        unreadCount: Number(row.unread_count ?? 0),
        messages: [],
        isSummary: true,
      };
    });
  }

  async hideConversations(userId: string, conversationIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(conversationIds.filter(Boolean)));
    if (uniqueIds.length === 0) return;

    const { error } = await supabase
      .from('conversation_user_hidden')
      .upsert(
        uniqueIds.map((conversationId) => ({
          user_id: userId,
          conversation_id: conversationId,
          hidden_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,conversation_id' }
      );
    if (error) throw error;
  }

  async sendMessage(
    conversationId: string,
    message: string,
    senderId: string,
    media?: { url: string; type: 'image' | 'video' },
    replyToMessageId?: string
  ): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text: message,
        media_url: media?.url,
        media_type: media?.type,
        reply_to_message_id: replyToMessageId,
      })
      .select('*, profiles!messages_sender_id_fkey(full_name, role), reply:messages!reply_to_message_id(text, sender_id, profiles!messages_sender_id_fkey(full_name))')
      .single();
    if (error) throw error;

    const { data: conversation } = await supabase
      .from('conversations')
      .select('booking_id, customer_id, driver_id')
      .eq('id', conversationId)
      .maybeSingle();
    const receiverId =
      conversation?.customer_id === senderId ? conversation?.driver_id : conversation?.customer_id;
    if (receiverId && receiverId !== senderId) {
      const senderName = data.profiles?.full_name ?? 'Daigo';
      const messagePreview =
        message.trim() ||
        (media?.type === 'video' ? 'Đã gửi một video' : media?.type === 'image' ? 'Đã gửi một ảnh' : 'Bạn có tin nhắn mới');
      await this.createNotificationSafely({
        userId: receiverId,
        title: `Tin nhắn mới từ ${senderName}`,
        content: messagePreview,
        type: 'system',
        read: false,
        relatedBookingId: conversation?.booking_id ?? undefined,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }

    return {
      id: data.id,
      sender: 'user',
      senderName: data.profiles?.full_name ?? 'Bạn',
      text: data.text,
      mediaUrl: data.media_url ?? undefined,
      mediaType: data.media_type ?? undefined,
      replyToMessageId: data.reply_to_message_id ?? undefined,
      replyToText: data.reply?.text ?? undefined,
      replyToSenderName: data.reply?.profiles?.full_name ?? undefined,
      timestamp: data.created_at,
      read: data.read,
    };
  }

  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', senderId);
    if (error) throw error;
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);
    if (error) throw error;
  }

  async markConversationThreadMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('customer_id, driver_id')
      .eq('id', conversationId)
      .single();
    if (error) throw error;

    const participantId =
      conversation.customer_id === userId ? conversation.driver_id : conversation.customer_id;

    if (!participantId) {
      await this.markConversationMessagesAsRead(conversationId, userId);
      return;
    }

    const { data: conversations, error: listError } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(customer_id.eq.${userId},driver_id.eq.${participantId}),and(customer_id.eq.${participantId},driver_id.eq.${userId})`
      );
    if (listError) throw listError;

    const ids = (conversations ?? []).map((item: any) => item.id);
    if (ids.length === 0) return;

    const { error: updateError } = await supabase
      .from('messages')
      .update({ read: true })
      .in('conversation_id', ids)
      .neq('sender_id', userId);
    if (updateError) throw updateError;
  }
}

export const apiClient = new ApiClient();
