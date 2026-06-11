// User Types
export type UserRole = 'customer' | 'driver';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type VehicleStatus = 'Sẵn sàng' | 'Đang bận' | 'Bảo trì';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  licensePlate: string;
  color: string;
  seats: number;
  pricePerKm: number;
  status: VehicleStatus;
  image: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'Chờ xác nhận'
  | 'Đã xác nhận'
  | 'Hoàn thành'
  | 'Đã hủy';

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  passengers: number;
  note?: string;
  vehicleId: string;
  vehicle: Vehicle;
  driverId: string;
  driverName: string;
  driverPhone: string;
  estimatedPrice: number;
  actualPrice?: number;
  distance?: number;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
}

export type NotificationType =
  | 'booking_success'
  | 'driver_confirm'
  | 'driver_cancel'
  | 'trip_done'
  | 'booking_update'
  | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  time: string;
  type: NotificationType;
  read: boolean;
  relatedBookingId?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'driver';
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface BlogPost {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string;
  caption: string;
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends AuthCredentials {
  fullName: string;
  phone: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
