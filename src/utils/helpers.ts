import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

// Format date
export const formatDate = (date: string | Date, format = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
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
  return dayjs(date).fromNow();
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
