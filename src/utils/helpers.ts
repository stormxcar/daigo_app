import dayjs from 'dayjs';

// Format date
export const formatDate = (date: string | Date, format = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

export const formatVietnamDate = (date?: string | Date | null): string => {
  if (!date) return '--';
  return dayjs(date).format('DD/MM/YYYY');
};

export const isoDateToVietnamDate = (date?: string | null): string => {
  if (!date) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

export const vietnamDateToIsoDate = (date: string): string | null => {
  const trimmed = date.trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Format time
export const formatTime = (time: string): string => {
  return dayjs(`2000-01-01 ${time}`).format('HH:mm');
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  return phone;
};

// Validate email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^0[0-9]{9}$/;
  return phoneRegex.test(phone);
};

// Calculate distance (mock calculation)
export const calculateDistance = (
  pickupLocation: string,
  dropoffLocation: string
): number => {
  // Mock distance calculation
  if (
    pickupLocation.toLowerCase().includes('sân bay') ||
    dropoffLocation.toLowerCase().includes('sân bay')
  ) {
    return 28; // km from centre to airport
  }
  return 12; // average city distance
};

// Calculate booking price
export const calculateBookingPrice = (
  distance: number,
  pricePerKm: number,
  passengerCount: number = 1
): { basePrice: number; platformFee: number; totalPrice: number } => {
  const basePrice = Math.max(distance * pricePerKm, 30000); // minimum booking price
  const platformFee = Math.floor(basePrice * 0.1); // 10% platform fee
  const totalPrice = basePrice + platformFee;

  return {
    basePrice,
    platformFee,
    totalPrice,
  };
};

// Get booking status label and color
export const getBookingStatusInfo = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'Chờ xác nhận': { label: 'Chờ xác nhận', color: '#f59e0b' }, // warning
    'Đã xác nhận': { label: 'Đã xác nhận', color: '#3b82f6' }, // info
    'Hoàn thành': { label: 'Hoàn thành', color: '#10b981' }, // success
    'Đã hủy': { label: 'Đã hủy', color: '#ef4444' }, // error
    CREATED: { label: 'Đã tạo chuyến', color: '#64748b' },
    SEARCHING_DRIVER: { label: 'Đang tìm tài xế', color: '#f59e0b' },
    DRIVER_ACCEPTED: { label: 'Tài xế đã nhận', color: '#3b82f6' },
    DRIVER_ARRIVING: { label: 'Tài xế đang tới', color: '#2563eb' },
    DRIVER_ARRIVED: { label: 'Tài xế đã đến', color: '#8b5cf6' },
    TRIP_STARTED: { label: 'Đang di chuyển', color: '#0ea5e9' },
    TRIP_COMPLETED: { label: 'Hoàn thành', color: '#10b981' },
    CUSTOMER_CANCELLED: { label: 'Khách đã hủy', color: '#ef4444' },
    DRIVER_CANCELLED: { label: 'Tài xế đã hủy', color: '#ef4444' },
    EXPIRED: { label: 'Đã hết hạn', color: '#64748b' },
  };
  return statusMap[status] || { label: status, color: '#64748b' };
};

// Get vehicle status label and color
export const getVehicleStatusInfo = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'Sẵn sàng': { label: 'Sẵn sàng', color: '#10b981' },
    'Đang bận': { label: 'Đang bận', color: '#f59e0b' },
    'Bảo trì': { label: 'Bảo trì', color: '#ef4444' },
  };
  return statusMap[status] || { label: status, color: '#64748b' };
};

// Time ago format
export const timeAgo = (date: string | Date): string => {
  const diffSeconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });
  const [unit, seconds] = units.find(([, value]) => Math.abs(diffSeconds) >= value) ?? ['second', 1];
  return formatter.format(Math.round(diffSeconds / seconds), unit);
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get initials from name
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Get random color
export const getRandomColor = (): string => {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  return colors[Math.floor(Math.random() * colors.length)];
};
