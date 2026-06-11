import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants';
import {
  AuthCredentials,
  RegisterData,
  AuthResponse,
  Vehicle,
  Booking,
  NotificationItem,
  Message,
  BlogPost,
  User,
} from '@/types';
import {
  MOCK_VEHICLES,
  MOCK_BOOKINGS,
  MOCK_NOTIFICATIONS,
  MOCK_CONVERSATIONS,
  MOCK_BLOG_POSTS,
} from './mockData';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage?.getItem('@vf7_auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Auth endpoints
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      // Mock API call - replace with real endpoint
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock response based on email
      if (credentials.email === 'khachhang@gmail.com') {
        return {
          token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
          user: {
            id: 'customer_1',
            fullName: 'Nguyễn Minh Anh',
            email: credentials.email,
            phone: '0912345678',
            avatarUrl:
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
            role: 'customer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      } else if (credentials.email === 'taixe.nguyenxuandai@gmail.com') {
        return {
          token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
          user: {
            id: 'driver_1',
            fullName: 'Nguyễn Xuân Đài',
            email: credentials.email,
            phone: '0907454517',
            avatarUrl:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
            role: 'driver',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }

      throw new Error('Invalid credentials');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
        user: {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: 'customer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Vehicle endpoints
  async getVehicles(): Promise<Vehicle[]> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_VEHICLES;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const vehicle = MOCK_VEHICLES.find((v) => v.id === id);
      if (!vehicle) throw new Error('Vehicle not found');
      return vehicle;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newVehicle: Vehicle = {
        id: 'vehicle_' + Math.random().toString(36).substr(2, 9),
        name: data.name || '',
        brand: data.brand || '',
        licensePlate: data.licensePlate || '',
        color: data.color || '',
        seats: data.seats || 5,
        pricePerKm: data.pricePerKm || 15000,
        status: 'Sẵn sàng',
        image: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      };
      return newVehicle;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const vehicle = MOCK_VEHICLES.find((v) => v.id === id);
      if (!vehicle) throw new Error('Vehicle not found');
      return {
        ...vehicle,
        ...data,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteVehicle(id: string): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Mock delete
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Booking endpoints
  async getBookings(filters?: { status?: string; driverId?: string; customerId?: string }): Promise<Booking[]> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      let bookings = MOCK_BOOKINGS;

      if (filters?.status) {
        bookings = bookings.filter((b) => b.status === filters.status);
      }
      if (filters?.driverId) {
        bookings = bookings.filter((b) => b.driverId === filters.driverId);
      }
      if (filters?.customerId) {
        bookings = bookings.filter((b) => b.customerId === filters.customerId);
      }

      return bookings;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getBookingById(id: string): Promise<Booking> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const booking = MOCK_BOOKINGS.find((b) => b.id === id);
      if (!booking) throw new Error('Booking not found');
      return booking;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newBooking: Booking = {
        id: 'BK-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        customerId: data.customerId || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        customerEmail: data.customerEmail || '',
        pickupLocation: data.pickupLocation || '',
        dropoffLocation: data.dropoffLocation || '',
        date: data.date || '',
        time: data.time || '',
        passengers: data.passengers || 1,
        vehicleId: data.vehicleId || '',
        vehicle: data.vehicle || MOCK_VEHICLES[0],
        driverId: data.driverId || '',
        driverName: data.driverName || '',
        driverPhone: data.driverPhone || '',
        estimatedPrice: data.estimatedPrice || 0,
        status: 'Chờ xác nhận',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      };
      return newBooking;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const booking = MOCK_BOOKINGS.find((b) => b.id === id);
      if (!booking) throw new Error('Booking not found');
      return {
        ...booking,
        ...data,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelBooking(id: string): Promise<Booking> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const booking = MOCK_BOOKINGS.find((b) => b.id === id);
      if (!booking) throw new Error('Booking not found');
      return {
        ...booking,
        status: 'Đã hủy' as const,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Notification endpoints
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_NOTIFICATIONS.filter((n) => n.userId === userId);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async markNotificationAsRead(id: string): Promise<NotificationItem> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const notification = MOCK_NOTIFICATIONS.find((n) => n.id === id);
      if (!notification) throw new Error('Notification not found');
      return { ...notification, read: true };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Blog endpoints
  async getBlogPosts(page: number = 1, pageSize: number = 10): Promise<BlogPost[]> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_BLOG_POSTS.slice((page - 1) * pageSize, page * pageSize);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createBlogPost(data: Partial<BlogPost>): Promise<BlogPost> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newPost: BlogPost = {
        id: 'post_' + Math.random().toString(36).substr(2, 9),
        driverId: data.driverId || '',
        driverName: data.driverName || '',
        caption: data.caption || '',
        mediaUrls: data.mediaUrls || [],
        mediaTypes: data.mediaTypes || [],
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newPost;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Chat endpoints
  async sendMessage(
    conversationId: string,
    message: string,
    senderId: string
  ): Promise<Message> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newMessage: Message = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        sender: senderId === 'user' ? 'user' : 'driver',
        senderName: senderId === 'user' ? 'You' : 'Driver',
        text: message,
        timestamp: new Date().toISOString(),
        read: false,
      };
      return newMessage;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const message =
        axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      return new Error(message);
    }
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

export const apiClient = new ApiClient();
