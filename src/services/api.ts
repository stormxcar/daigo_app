import * as WebBrowser from 'expo-web-browser';
import { AuthCredentials, AuthResponse, BlogComment, BlogPost, Booking, ChatConversation, Message, NotificationItem, RegisterData, User, Vehicle } from '@/types';
import { supabase } from './supabase';

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
  email_verified: boolean;
  role: User['role'];
  created_at: string;
  updated_at: string;
};

const mapProfile = (row: ProfileRow): User => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url ?? undefined,
  address: row.address ?? '',
  emailVerified: row.email_verified,
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
    passengers: row.passengers,
    note: row.note ?? undefined,
    vehicleId: row.vehicle_id,
    vehicle,
    driverId: row.driver_id ?? '',
    driverName: driver?.full_name ?? 'Đang chờ tài xế',
    driverPhone: driver?.phone ?? '',
    estimatedPrice: row.estimated_price,
    actualPrice: row.actual_price ?? undefined,
    distance: row.distance ? Number(row.distance) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
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

class ApiClient {
  async getCurrentUser(): Promise<User | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) throw error;
    return mapProfile(data as ProfileRow);
  }

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;

    const user = await this.getCurrentUser();
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
      throw new Error('Đăng nhập Google đã bị hủy');
    }

    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = await this.getCurrentUser();
    if (!user || !sessionData.session) throw new Error('Không tìm thấy phiên đăng nhập Google');

    return { token: sessionData.session.access_token, user };
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

    const user = await this.getCurrentUser();
    if (!user || !data.session) throw new Error('Không tìm thấy hồ sơ người dùng');

    return { token: data.session.access_token, user };
  }

  async resetPassword(email: string, redirectTo?: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }

  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: data.role ?? 'customer',
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
          role: data.role ?? 'customer',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const user = await this.getCurrentUser();
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
      })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return mapProfile(updated as ProfileRow);
  }

  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, profiles!vehicles_driver_id_fkey(full_name, phone, avatar_url)')
      .order('price_per_km', { ascending: true });

    if (error) throw error;
    return (data as VehicleRow[]).map(mapVehicle);
  }

  async getDriverVehicles(driverId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as VehicleRow[]).map(mapVehicle);
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
        description: data.description,
      })
      .select('*')
      .single();
    if (error) throw error;
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
        description: data.description,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapVehicle(updated as VehicleRow);
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  }

  async getBookings(filters?: { status?: string; driverId?: string; customerId?: string }): Promise<Booking[]> {
    let query = supabase
      .from('bookings')
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.driverId) query = query.eq('driver_id', filters.driverId);
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapBooking);
  }

  async getBookingById(id: string): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapBooking(data);
  }

  async createBooking(data: Partial<Booking> & { pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number }): Promise<Booking> {
    const selectedDriverId = data.driverId || data.vehicle?.driverId || null;
    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: data.customerId,
        vehicle_id: data.vehicleId,
        driver_id: selectedDriverId,
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

    await supabase.from('conversations').insert({
      booking_id: inserted.id,
      customer_id: data.customerId,
      driver_id: selectedDriverId,
    });

    await this.createNotificationSafely({
      userId: data.customerId ?? '',
      title: 'Đặt lịch xe thành công',
      content: `Yêu cầu đặt xe ${inserted.booking_code} đã được gửi.`,
      type: 'booking_success',
      read: false,
      relatedBookingId: inserted.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });

    if (selectedDriverId) {
      await this.createNotificationSafely({
        userId: selectedDriverId,
        title: 'Có chuyến đi mới',
        content: `Khách hàng đặt chuyến từ ${inserted.pickup_location} đến ${inserted.dropoff_location}.`,
        type: 'booking_update',
        read: false,
        relatedBookingId: inserted.id,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }

    return mapBooking(inserted);
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update({
        status: data.status,
        driver_id: data.driverId || undefined,
        actual_price: data.actualPrice,
        note: data.note,
      })
      .eq('id', id)
      .select('*, vehicles(*), customer:profiles!bookings_customer_id_fkey(*), driver:profiles!bookings_driver_id_fkey(*)')
      .single();
    if (error) throw error;
    return mapBooking(updated);
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.updateBooking(id, { status: 'Đã hủy' });
    const receiverId = booking.customerId;
    if (receiverId) {
      await this.createNotificationSafely({
        userId: receiverId,
        title: 'Chuyến đi đã bị hủy',
        content: `Chuyến đi từ ${booking.pickupLocation} đến ${booking.dropoffLocation} đã bị hủy.`,
        type: 'driver_cancel',
        read: false,
        relatedBookingId: booking.id,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }
    return booking;
  }

  async acceptBooking(id: string, driverId: string): Promise<Booking> {
    const booking = await this.updateBooking(id, { status: 'Đã xác nhận', driverId });
    await supabase.from('conversations').update({ driver_id: driverId }).eq('booking_id', id);
    await this.createNotificationSafely({
      userId: booking.customerId,
      title: 'Tài xế đã xác nhận chuyến đi',
      content: `Chuyến đi từ ${booking.pickupLocation} đến ${booking.dropoffLocation} đã được tài xế xác nhận.`,
      type: 'driver_confirm',
      read: false,
      relatedBookingId: booking.id,
      createdAt: new Date().toISOString(),
      time: 'Vừa xong',
    });
    return booking;
  }

  async getNotifications(userId: string): Promise<NotificationItem[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
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
    }));
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
    return {
      ...data,
      id: inserted.id,
      createdAt: inserted.created_at,
      time: new Date(inserted.created_at).toLocaleString('vi-VN'),
    };
  }

  async createNotificationSafely(data: Omit<NotificationItem, 'id'> & { id?: string }): Promise<NotificationItem | null> {
    try {
      return await this.createNotification(data);
    } catch (error) {
      console.warn('Không thể tạo thông báo phụ trợ', error);
      return null;
    }
  }

  async markNotificationAsRead(id: string): Promise<NotificationItem> {
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select('*').single();
    if (error) throw error;
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      content: data.content,
      time: new Date(data.created_at).toLocaleString('vi-VN'),
      type: data.type,
      read: data.read,
      relatedBookingId: data.related_booking_id ?? undefined,
      relatedPostId: data.related_post_id ?? undefined,
      createdAt: data.created_at,
    };
  }

  async getBlogPosts(page = 1, pageSize = 10, filters?: { driverId?: string }): Promise<BlogPost[]> {
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
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId || posts.length === 0) return posts;

    const { data: likes } = await supabase
      .from('blog_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', posts.map((post) => post.id));
    const likedIds = new Set((likes ?? []).map((item: any) => item.post_id));
    return posts.map((post) => ({ ...post, liked: likedIds.has(post.id) }));
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
    return mapBlogPost(updated);
  }

  async deleteBlogPost(id: string): Promise<void> {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
  }

  async toggleBlogLike(postId: string, userId: string): Promise<BlogPost> {
    const postBefore = await this.getBlogPostById(postId);
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
      if (postBefore.driverId !== userId) {
        await this.createNotificationSafely({
          userId: postBefore.driverId,
          title: 'Bài viết có lượt thích mới',
          content: `${postBefore.driverName ? 'Khách hàng' : 'Có người'} vừa thả tim bài viết của bạn.`,
          type: 'blog_interaction',
          read: false,
          relatedPostId: postId,
          createdAt: new Date().toISOString(),
          time: 'Vừa xong',
        });
      }
    }

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
    const post = await this.getBlogPostById(postId);
    if (post.driverId !== authorId) {
      await this.createNotificationSafely({
        userId: post.driverId,
        title: parentCommentId ? 'Có trả lời bình luận mới' : 'Có bình luận mới',
        content: `${data.profiles?.full_name ?? 'Khách hàng'} vừa bình luận về bài viết của bạn.`,
        type: 'blog_interaction',
        read: false,
        relatedPostId: postId,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }
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

  async shareBlogPost(postId: string, userId: string): Promise<BlogPost> {
    const { error } = await supabase.from('blog_shares').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    const post = await this.getBlogPostById(postId);
    if (post.driverId !== userId) {
      await this.createNotificationSafely({
        userId: post.driverId,
        title: 'Bài viết được chia sẻ',
        content: 'Một khách hàng vừa chia sẻ bài viết của bạn.',
        type: 'blog_interaction',
        read: false,
        relatedPostId: postId,
        createdAt: new Date().toISOString(),
        time: 'Vừa xong',
      });
    }
    return this.getBlogPostById(postId);
  }

  async getConversations(userId: string): Promise<ChatConversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, customer:profiles!conversations_customer_id_fkey(*), driver:profiles!conversations_driver_id_fkey(*), messages(*, profiles!messages_sender_id_fkey(full_name, role))')
      .or(`customer_id.eq.${userId},driver_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const conversations = (data ?? []).map((row: any) => {
      const participant = row.customer_id === userId ? row.driver : row.customer;
      const messages = [...(row.messages ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const mappedMessages: Message[] = messages.map((message: any) => ({
        id: message.id,
        sender: message.sender_id === userId ? 'user' as const : 'driver' as const,
        senderName: message.profiles?.full_name ?? 'Người dùng',
        text: message.text,
        timestamp: message.created_at,
        read: message.read,
      }));
      const lastMessage = mappedMessages[mappedMessages.length - 1];

      return {
        id: row.id,
        participantId: participant?.id ?? '',
        participantName: participant?.full_name ?? 'Tài xế sẽ xác nhận',
        participantPhone: participant?.phone ?? undefined,
        participantAvatar: participant?.avatar_url ?? undefined,
        lastMessage: lastMessage?.text ?? 'Chưa có tin nhắn',
        lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleString('vi-VN') : '',
        unreadCount: messages.filter((message: any) => !message.read && message.sender_id !== userId).length,
        messages: mappedMessages,
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
        unreadCount: existing.unreadCount + conversation.unreadCount,
        messages: mergedMessages,
        lastMessage: lastMessage?.text ?? existing.lastMessage,
        lastMessageTime: lastMessage?.timestamp ? new Date(lastMessage.timestamp).toLocaleString('vi-VN') : existing.lastMessageTime,
        updatedAt: keepCurrentId ? conversation.updatedAt : existing.updatedAt,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .map(({ updatedAt, ...conversation }) => conversation);
  }

  async sendMessage(conversationId: string, message: string, senderId: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, text: message })
      .select('*, profiles!messages_sender_id_fkey(full_name, role)')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      sender: 'user',
      senderName: data.profiles?.full_name ?? 'Bạn',
      text: data.text,
      timestamp: data.created_at,
      read: data.read,
    };
  }

  async markConversationMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);
    if (error) throw error;
  }
}

export const apiClient = new ApiClient();
