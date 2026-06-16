// API Constants
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const API_TIMEOUT = 30000; // 30 seconds

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@vf7_auth_token',
  REFRESH_TOKEN: '@vf7_refresh_token',
  USER_DATA: '@vf7_user_data',
  THEME_MODE: '@vf7_theme_mode',
  ONBOARDING_COMPLETED: '@vf7_onboarding_completed',
  NOTIFICATIONS: '@vf7_notifications',
  BOOKINGS: '@vf7_bookings',
  VEHICLES: '@vf7_vehicles',
  CHAT_HISTORY: '@vf7_chat_history',
  RECENT_LOCATIONS: '@vf7_recent_locations',
  PREFERRED_PAYMENT: '@vf7_preferred_payment',
} as const;

// Vehicle Status
export const VEHICLE_STATUS = {
  READY: 'Sẵn sàng',
  BUSY: 'Đang bận',
  MAINTENANCE: 'Bảo trì',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  CREATED: 'CREATED',
  SEARCHING_DRIVER: 'SEARCHING_DRIVER',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  CUSTOMER_CANCELLED: 'CUSTOMER_CANCELLED',
  DRIVER_CANCELLED: 'DRIVER_CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.SEARCHING_DRIVER,
  BOOKING_STATUS.DRIVER_ACCEPTED,
  BOOKING_STATUS.DRIVER_ARRIVING,
  BOOKING_STATUS.DRIVER_ARRIVED,
  BOOKING_STATUS.TRIP_STARTED,
] as const;

export const TERMINAL_BOOKING_STATUSES = [
  BOOKING_STATUS.TRIP_COMPLETED,
  BOOKING_STATUS.CUSTOMER_CANCELLED,
  BOOKING_STATUS.DRIVER_CANCELLED,
  BOOKING_STATUS.EXPIRED,
] as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  BOOKING_SUCCESS: 'booking_success',
  DRIVER_CONFIRM: 'driver_confirm',
  DRIVER_CANCEL: 'driver_cancel',
  TRIP_DONE: 'trip_done',
  BOOKING_UPDATE: 'booking_update',
  SYSTEM: 'system',
} as const;

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
} as const;

// Tab Names
export const CUSTOMER_TABS = {
  HOME: 'home',
  BOOKING: 'booking',
  BLOG: 'blog',
  CHAT: 'chat',
  PROFILE: 'profile',
} as const;

export const DRIVER_TABS = {
  DASHBOARD: 'dashboard',
  BLOG: 'blog',
  BOOKINGS: 'bookings',
  VEHICLES: 'vehicles',
  CHAT: 'chat',
  PROFILE: 'profile',
} as const;

// Price Calculation
export const PRICE_CONFIG = {
  BASE_PRICE_PER_KM: 15000, // VND
  MINIMUM_BOOKING_PRICE: 30000, // VND
  PLATFORM_FEE_PERCENT: 10, // 10%
  SURGE_MULTIPLIER_PEAK: 1.2, // 20% increase during peak hours
  CANCELLATION_FEE_PERCENT: 50, // 50% of estimated price
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  BOOKING_CANCELLATION_WINDOW: 30 * 60 * 1000, // 30 minutes in milliseconds
  OTP_VALIDITY: 10 * 60 * 1000, // 10 minutes
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  AUTO_LOGOUT_WARNING: 5 * 60 * 1000, // 5 minutes before logout
} as const;

// OTP Settings
export const OTP_SETTINGS = {
  LENGTH: 6,
  RESEND_TIMEOUT: 60, // seconds
  MAX_ATTEMPTS: 5,
} as const;

// Rating Config
export const RATING_CONFIG = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  STAR_LABELS: {
    1: 'Tệ',
    2: 'Không tốt',
    3: 'Trung bình',
    4: 'Tốt',
    5: 'Tuyệt vời',
  },
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  INITIAL_PAGE: 1,
} as const;

// Distance Config
export const DISTANCE_CONFIG = {
  MIN_DISTANCE: 1, // km
  MAX_DISTANCE: 100, // km
  UNIT: 'km',
} as const;

// Default Locations (Vietnamese cities)
export const DEFAULT_LOCATIONS = {
  HANOI: {
    name: 'Hà Nội',
    lat: 21.0285,
    lng: 105.8542,
  },
  HCM: {
    name: 'Thành phố Hồ Chí Minh',
    lat: 10.7769,
    lng: 106.7009,
  },
};

// UI Constants
export const UI_CONSTANTS = {
  TAB_BAR_HEIGHT: 60,
  STATUS_BAR_HEIGHT: 44,
  SAFE_AREA_PADDING: 16,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 250,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Kết nối mạng không ổn định. Vui lòng thử lại.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra.',
  UNAUTHORIZED: 'Vui lòng đăng nhập lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  BOOKING_FAILED: 'Không thể tạo chuyến đi. Vui lòng thử lại.',
  PAYMENT_FAILED: 'Thanh toán không thành công. Vui lòng thử lại.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  BOOKING_CREATED: 'Chuyến đi được tạo thành công!',
  BOOKING_CANCELLED: 'Chuyến đi được hủy thành công!',
  PROFILE_UPDATED: 'Hồ sơ được cập nhật thành công!',
  PASSWORD_CHANGED: 'Mật khẩu được đổi thành công!',
  POST_CREATED: 'Bài viết được tạo thành công!',
  POST_DELETED: 'Bài viết được xóa thành công!',
} as const;

// Demo/Test Data
export const DEMO_CREDENTIALS = {
  CUSTOMER: {
    email: 'khachhang@gmail.com',
    password: 'password123',
  },
  DRIVER: {
    email: 'taixe.nguyenxuandai@gmail.com',
    password: 'tai-xe-quan-tri-7',
  },
} as const;
