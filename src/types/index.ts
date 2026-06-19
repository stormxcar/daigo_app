// User Types
export type UserRole = 'customer' | 'driver';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  address?: string;
  bankName?: string;
  bankCode?: string;
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  emailVerified?: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSettings {
  userId: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  locationSharingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VehicleStatus = 'Sẵn sàng' | 'Đang bận' | 'Bảo trì';

export interface Vehicle {
  id: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  name: string;
  brand: string;
  licensePlate: string;
  color: string;
  seats: number;
  pricePerKm: number;
  status: VehicleStatus;
  image: string;
  imageUrls?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'CREATED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'CUSTOMER_CANCELLED'
  | 'DRIVER_CANCELLED'
  | 'EXPIRED';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'vietqr';
export type PaymentStatus = 'pending' | 'submitted' | 'driver_verified' | 'rejected' | 'expired';
export type BookingPaymentStatus = 'unpaid' | 'pending' | 'submitted' | 'paid' | 'rejected' | 'expired';

export interface Booking {
  id: string;
  bookingCode?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLocation: string;
  dropoffLat?: number;
  dropoffLng?: number;
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
  paymentStatus?: BookingPaymentStatus;
  paymentMethod?: PaymentMethod;
  distance?: number;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  locked?: boolean;
  acceptedAt?: string;
  arrivingAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  cancelReason?: string;
}

export type BookingDispatchStatus = 'pending' | 'accepted' | 'rejected' | 'timeout' | 'skipped';

export interface BookingDispatch {
  id: string;
  bookingId: string;
  driverId: string;
  status: BookingDispatchStatus;
  attempt: number;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  booking?: Booking;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  driverId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  bankName?: string;
  bankCode?: string;
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  transferContent: string;
  qrUrl?: string;
  proofImageUrl?: string;
  driverNote?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  expiresAt?: string;
}

export type TripPhase = 'pickup' | 'dropoff';

export interface DriverLocation {
  bookingId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  phase: TripPhase;
  updatedAt: string;
  createdAt?: string;
}

export interface RatingReview {
  id: string;
  bookingId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface SavedLocation {
  id: string;
  userId: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  type: 'home' | 'work' | 'favorite' | 'other';
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'booking_success'
  | 'driver_confirm'
  | 'driver_cancel'
  | 'trip_done'
  | 'booking_update'
  | 'payment_update'
  | 'blog_interaction'
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
  relatedPostId?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'driver';
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyToMessageId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  timestamp: string;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  threadIds?: string[];
  bookingId?: string;
  participantId: string;
  participantName: string;
  participantPhone?: string;
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
  parentCommentId?: string;
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
  role?: UserRole;
}

export type CallType = 'agora' | 'phone';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'failed';

export interface CallSession {
  id: string;
  bookingId?: string;
  chatId?: string;
  callerId: string;
  receiverId: string;
  callType: CallType;
  agoraChannel?: string;
  status: CallStatus;
  startedAt?: string;
  acceptedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  createdAt: string;
  updatedAt: string;
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
