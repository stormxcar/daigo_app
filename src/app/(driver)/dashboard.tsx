import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BarChart3, Briefcase, LocateFixed, Newspaper, Percent, Route, Star, TrendingUp, Wallet } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { ActiveTripSheet } from '@/components/ActiveTripSheet';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BlogPost, Booking, RatingReview, Vehicle } from '@/types';
import { DeviceLocation, getCurrentDeviceLocation } from '@/services/deviceLocation';
import { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } from '@/constants';
import { showError, showSuccess } from '@/utils/toast';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { getPaymentMethodLabel, PaymentStatusBadge } from '@/components/PaymentStatusBadge';

type RangeMode = 'day' | 'month' | 'year';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

function getBucketLabel(date: Date, mode: RangeMode) {
  if (mode === 'day') return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  if (mode === 'month') return date.toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' });
  return String(date.getFullYear());
}

function buildBuckets(mode: RangeMode) {
  const count = mode === 'day' ? 7 : mode === 'month' ? 6 : 3;
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date();
    const offset = count - index - 1;
    if (mode === 'day') date.setDate(date.getDate() - offset);
    if (mode === 'month') date.setMonth(date.getMonth() - offset);
    if (mode === 'year') date.setFullYear(date.getFullYear() - offset);
    return { key: getBucketLabel(date, mode), label: getBucketLabel(date, mode), trips: 0, revenue: 0 };
  });
}

function DriverAvailabilityToggle({
  enabled,
  loading,
  onPress,
}: {
  enabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(enabled ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [enabled, progress]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceAlt, colors.success],
  });
  const thumbTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 43],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={loading}
      style={{
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '900' }}>
          {enabled ? 'Đang nhận chuyến' : 'Tạm dừng nhận chuyến'}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, fontSize: fontSize.sm }}>
          {enabled ? 'Khách hàng có thể gửi booking mới cho bạn.' : 'Bật lại khi bạn sẵn sàng chạy xe.'}
        </Text>
      </View>

      <Animated.View
        style={{
          width: 82,
          height: 42,
          borderRadius: 21,
          padding: 3,
          backgroundColor: trackColor,
          borderWidth: 1,
          borderColor: enabled ? colors.success : colors.border,
          opacity: loading ? 0.72 : 1,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateX: thumbTranslate }],
          }}
        >
          {loading && <ActivityIndicator size="small" color={enabled ? colors.success : colors.primary} />}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function DriverDashboard() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [ratings, setRatings] = useState<RatingReview[]>([]);
  const [mode, setMode] = useState<RangeMode>('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverLocation, setDriverLocation] = useState<DeviceLocation | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('PENDING');
  const [onlineLoading, setOnlineLoading] = useState(false);

  const loadData = useCallback(async (manualRefresh = false) => {
    if (!user) return;
    try {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [allBookings, driverVehicles, driverPosts, driverStatus, driverRatings] = await Promise.all([
        apiClient.getBookings({ driverId: user.id, page: 1, pageSize: 200 }),
        apiClient.getDriverVehicles(user.id),
        apiClient.getBlogPosts(1, 20, { driverId: user.id }),
        apiClient.getDriverStatus(user.id),
        apiClient.getRatingsForUser(user.id),
      ]);
      setBookings(allBookings);
      setVehicles(driverVehicles);
      setPosts(driverPosts);
      setRatings(driverRatings);
      setIsOnline(!!driverStatus?.isOnline);
      setVerificationStatus(driverStatus?.verificationStatus ?? 'PENDING');
      getCurrentDeviceLocation().then(setDriverLocation).catch(() => undefined);
    } catch (error: any) {
      showError('Không thể tải thống kê', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleOnline = async () => {
    if (!user) return;
    try {
      setOnlineLoading(true);
      const location = await getCurrentDeviceLocation().catch(() => driverLocation);
      const updated = await apiClient.setDriverOnline(user.id, !isOnline, location ?? undefined);
      setIsOnline(updated.isOnline);
      setVerificationStatus(updated.verificationStatus);
      if (location) setDriverLocation(location);
      showSuccess(updated.isOnline ? 'Đã bật nhận chuyến' : 'Đã tắt nhận chuyến', 'Trạng thái tài xế đã được cập nhật.');
    } catch (error: any) {
      showError('Không thể cập nhật trạng thái tài xế', error.message);
    } finally {
      setOnlineLoading(false);
    }
  };

  const stats = useMemo(() => {
    const completed = bookings.filter((booking) => booking.status === BOOKING_STATUS.TRIP_COMPLETED);
    const active = bookings.filter((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status as any));
    const cancelledByDriver = bookings.filter((booking) => booking.status === BOOKING_STATUS.DRIVER_CANCELLED);
    const accepted = bookings.filter((booking) => booking.driverId === user?.id);
    const revenue = completed.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const distance = completed.reduce((sum, booking) => sum + (booking.distance ?? 0), 0);
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCompleted = completed.filter((booking) => booking.date === todayKey);
    const todayRevenue = todayCompleted.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekRevenue = completed
      .filter((booking) => new Date(booking.date || booking.createdAt) >= sevenDaysAgo)
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthCompleted = completed.filter((booking) => new Date(booking.date || booking.createdAt) >= monthStart);
    const monthRevenue = monthCompleted.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const monthDistance = monthCompleted.reduce((sum, booking) => sum + (booking.distance ?? 0), 0);
    const averageTrip = completed.length ? Math.round(revenue / completed.length) : 0;
    const averageRating = ratings.length ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length : 0;
    const acceptanceRate = bookings.length ? Math.round((accepted.length / bookings.length) * 100) : 0;
    const rejectionRate = bookings.length ? Math.round((cancelledByDriver.length / bookings.length) * 100) : 0;
    return {
      completed: completed.length,
      active: active.length,
      revenue,
      todayRevenue,
      todayCompleted: todayCompleted.length,
      weekRevenue,
      averageTrip,
      averageRating,
      ratingCount: ratings.length,
      acceptanceRate,
      rejectionRate,
      distance,
      monthRevenue,
      monthDistance,
      monthTrips: monthCompleted.length,
    };
  }, [bookings, ratings, user?.id]);
  const activeTrip = bookings.find((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status as any));

  const chart = useMemo(() => {
    const buckets = buildBuckets(mode);
    bookings.forEach((booking) => {
      const date = new Date(booking.date || booking.createdAt);
      const label = getBucketLabel(date, mode);
      const bucket = buckets.find((item) => item.key === label);
      if (!bucket) return;
      bucket.trips += 1;
      bucket.revenue += booking.actualPrice ?? booking.estimatedPrice ?? 0;
    });
    const maxValue = Math.max(...buckets.map((item) => item.revenue), 1);
    return buckets.map((bucket) => ({ ...bucket, height: Math.max(8, Math.round((bucket.revenue / maxValue) * 132)) }));
  }, [bookings, mode]);
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);
  const paymentSummary = useMemo(() => {
    const cash = bookings.filter((booking) => booking.paymentMethod === 'cash');
    const transfer = bookings.filter((booking) => booking.paymentMethod === 'bank_transfer' || booking.paymentMethod === 'vietqr');
    const pendingReview = bookings.filter((booking) => ['pending', 'submitted'].includes(booking.paymentStatus ?? 'unpaid'));
    const paid = bookings.filter((booking) => ['paid', 'driver_verified'].includes(booking.paymentStatus ?? 'unpaid'));
    return {
      cash: cash.length,
      transfer: transfer.length,
      pendingReview: pendingReview.length,
      paid: paid.length,
    };
  }, [bookings]);

  const summaryCards = [
    { label: 'Doanh thu', value: money(stats.revenue), icon: <Wallet size={20} color={colors.primary} /> },
    { label: 'Hoàn thành', value: String(stats.completed), icon: <Briefcase size={20} color={colors.success} /> },
    { label: 'Đang xử lý', value: String(stats.active), icon: <BarChart3 size={20} color={colors.info} /> },
    { label: 'Rating', value: stats.ratingCount ? stats.averageRating.toFixed(1) : '--', icon: <Star size={20} color={colors.warning} /> },
  ];

  return (
    <Screen scroll refreshing={refreshing || loading} onRefresh={() => loadData(true)}>
      <ActiveTripSheet
        booking={activeTrip}
        role="driver"
        onOpenDetail={(id) => router.push({ pathname: '/(driver)/booking-detail' as any, params: { id } })}
      />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.xs, marginTop: spacing.md }}>
          Thống kê tài xế
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
          Dữ liệu lấy trực tiếp từ booking, xe và bài viết trong database.
        </Text>
      </View>

      <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primaryLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <LocateFixed size={22} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '900' }}>GPS tài xế</Text>
            <Text numberOfLines={2} style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {driverLocation?.label ?? 'Cho phép GPS để chỉ đường đến điểm đón chính xác hơn.'}
            </Text>
            <Text style={{ color: isOnline ? colors.success : colors.textTertiary, fontWeight: '800', marginTop: spacing.xs }}>
              {isOnline ? 'Đang online nhận chuyến' : 'Đang offline'}
            </Text>
          </View>
        </View>
        <DriverAvailabilityToggle
          enabled={isOnline}
          loading={onlineLoading}
          onPress={toggleOnline}
        />
      </Card>

      {loading && (
        <>
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
        </>
      )}

      {!loading && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        {summaryCards.map((item) => (
          <Card key={item.label} style={{ width: '47%', minHeight: 104 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{item.label}</Text>
              {item.icon}
            </View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
          </Card>
        ))}
      </View>}

      {!loading && (
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Chuyến đi gần đây</Text>
            <Button
              label="Xem tất cả"
              size="sm"
              variant="outline"
              onPress={() => router.push('/(driver)/bookings' as any)}
            />
          </View>
          {recentBookings.length === 0 ? (
            <View style={{ padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.xs }}>Chưa có chuyến đi</Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
                Khi bạn nhận hoặc hoàn thành chuyến, danh sách gần đây sẽ hiển thị tại đây.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {recentBookings.map((booking) => {
                const statusInfo = getBookingStatusInfo(booking.status);
                const amount = booking.actualPrice ?? booking.estimatedPrice ?? 0;
                return (
                  <TouchableOpacity
                    key={booking.id}
                    activeOpacity={0.82}
                    onPress={() => router.push({ pathname: '/(driver)/booking-detail' as any, params: { id: booking.id } })}
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.lg,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontWeight: '900' }}>
                        {booking.pickupLocation}
                      </Text>
                      <Text style={{ color: colors.primary, fontWeight: '900' }}>{money(amount)}</Text>
                    </View>
                    <Text numberOfLines={1} style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
                      đến {booking.dropoffLocation}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                      <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
                        {booking.time} - {formatVietnamDate(booking.date)}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '800' }}>
                        {statusInfo.label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
                      <PaymentStatusBadge status={booking.paymentStatus} />
                      <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: '700' }}>
                        {getPaymentMethodLabel(booking.paymentMethod)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>
      )}

      {!loading && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
            Thống kê thanh toán
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { label: 'Tiền mặt', value: paymentSummary.cash, color: colors.success },
              { label: 'VietQR/CK', value: paymentSummary.transfer, color: colors.primary },
              { label: 'Chờ xác nhận', value: paymentSummary.pendingReview, color: colors.warning },
              { label: 'Đã xác nhận', value: paymentSummary.paid, color: colors.info },
            ].map((item, index) => (
              <View
                key={item.label}
                style={{
                  width: '50%',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.sm,
                  borderBottomWidth: index < 2 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
                <Text style={{ color: item.color, fontWeight: '900', fontSize: 22, marginTop: spacing.xs }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {!loading && (
        <Card style={{ marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.primaryLight }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
            Doanh thu theo ngày
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {[
              { label: 'Hôm nay', value: money(stats.todayRevenue), sub: `${stats.todayCompleted} chuyến hoàn thành` },
              { label: '7 ngày', value: money(stats.weekRevenue), sub: 'Doanh thu tuần này' },
              { label: 'TB/chuyến', value: money(stats.averageTrip), sub: 'Giá trị trung bình' },
            ].map((item) => (
              <View key={item.label} style={{ flex: 1, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
                <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '900', marginTop: spacing.xs }}>{item.value}</Text>
                <Text numberOfLines={2} style={{ color: colors.textTertiary, fontSize: 10, marginTop: spacing.xs }}>{item.sub}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {!loading && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
            Hiệu suất tài xế
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {[
              { label: 'Tỷ lệ nhận', value: `${stats.acceptanceRate}%`, sub: 'Trong 200 chuyến gần nhất', icon: <Percent size={18} color={colors.success} /> },
              { label: 'Tỷ lệ từ chối', value: `${stats.rejectionRate}%`, sub: 'Chuyến tài xế hủy', icon: <Percent size={18} color={colors.error} /> },
              { label: 'Km tháng này', value: `${stats.monthDistance.toFixed(1)} km`, sub: `${stats.monthTrips} chuyến hoàn thành`, icon: <Route size={18} color={colors.info} /> },
              { label: 'Doanh thu tháng', value: money(stats.monthRevenue), sub: 'Từ chuyến hoàn thành', icon: <TrendingUp size={18} color={colors.primary} /> },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  width: '47%',
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.surfaceAlt,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '700' }}>{item.label}</Text>
                  {item.icon}
                </View>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{item.value}</Text>
                <Text numberOfLines={2} style={{ color: colors.textTertiary, fontSize: 10, marginTop: spacing.xs }}>{item.sub}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {!loading && (
        <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.surfaceAlt }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' }}>
              <Star size={26} color="#ffffff" fill="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
                {stats.ratingCount ? `${stats.averageRating.toFixed(1)}/5` : 'Chưa có đánh giá'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {stats.ratingCount ? `${stats.ratingCount} đánh giá từ khách hàng` : 'Điểm đánh giá sẽ hiển thị sau chuyến hoàn thành đầu tiên.'}
              </Text>
            </View>
            <Button
              label="Xem"
              size="sm"
              variant="outline"
              onPress={() => router.push('/(driver)/profile' as any)}
            />
          </View>
        </Card>
      )}

      {!loading && <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Biểu đồ doanh thu</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {[
              { key: 'day', label: 'Ngày' },
              { key: 'month', label: 'Tháng' },
              { key: 'year', label: 'Năm' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setMode(item.key as RangeMode)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: borderRadius.full,
                  backgroundColor: mode === item.key ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: mode === item.key ? 'white' : colors.text, fontSize: fontSize.xs, fontWeight: '700' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 168, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          {chart.map((bucket) => (
            <View key={bucket.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 10, marginBottom: spacing.xs }}>
                {bucket.trips} chuyến
              </Text>
              <View
                style={{
                  width: '76%',
                  height: bucket.height,
                  borderRadius: borderRadius.md,
                  backgroundColor: bucket.revenue > 0 ? colors.primary : colors.surfaceAlt,
                }}
              />
              <Text numberOfLines={1} style={{ color: colors.textTertiary, fontSize: 10, marginTop: spacing.xs }}>
                {bucket.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>}

      {!loading && <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Hoạt động nội dung</Text>
          <Newspaper size={20} color={colors.primary} />
        </View>
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          Bạn có {posts.length} bài viết, {posts.reduce((sum, post) => sum + post.likes, 0)} lượt thích và {posts.reduce((sum, post) => sum + post.comments, 0)} bình luận.
        </Text>
      </Card>}

      {!loading && bookings.length === 0 && vehicles.length === 0 && posts.length === 0 && (
        <EmptyState
          icon={<BarChart3 size={48} color={colors.primary} />}
          title="Chưa có dữ liệu"
          description="Khi có xe, bài viết hoặc chuyến đi, thống kê sẽ tự cập nhật từ database."
        />
      )}
    </Screen>
  );
}
