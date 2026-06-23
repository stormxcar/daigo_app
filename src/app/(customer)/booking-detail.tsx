import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Car, CheckCircle2, Clock, FileText, MapPin, Navigation, Phone, Route, Star, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Booking, DriverLocation, RatingReview, Vehicle } from '@/types';
import { MapPreview } from '@/components/MapPreview';
import { RealtimeTripMap } from '@/components/RealtimeTripMap';
import { BookingTimeline } from '@/components/BookingTimeline';
import { LazyMount } from '@/components/LazyMount';
import { PaymentStatusBadge, getPaymentStatusLabel } from '@/components/PaymentStatusBadge';
import { getDistanceMeters, getDriverLocation, subscribeDriverLocation } from '@/services/driverLocation';
import { subscribeBookingStatus } from '@/services/bookingRealtimeService';
import { getDrivingRoute, LatLng } from '@/services/mapRouteService';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { BOOKING_STATUS, CUSTOMER_CANCEL_REASONS } from '@/constants';
import { showError, showSuccess, showWarning } from '@/utils/toast';

const ETA_REFRESH_INTERVAL_MS = 20_000;
const ETA_REFRESH_DISTANCE_METERS = 120;
const ETA_ACTIVE_STATUSES = [
  BOOKING_STATUS.DRIVER_ACCEPTED,
  BOOKING_STATUS.DRIVER_ARRIVING,
  BOOKING_STATUS.DRIVER_ARRIVED,
] as const;

function DetailSection({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const formatEta = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} phút`;
};

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    vehicleId?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    date?: string;
    time?: string;
    passengers?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    distance?: string;
    estimatedPrice?: string;
    routeDuration?: string;
    note?: string;
  }>();

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [ratingReview, setRatingReview] = useState<RatingReview | null>(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [driverEta, setDriverEta] = useState<{ text: string; distanceMeters: number; updatedAt: string } | null>(null);
  const [driverEtaLoading, setDriverEtaLoading] = useState(false);
  const [driverEtaError, setDriverEtaError] = useState<string | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;
  const lastEtaRequestAtRef = useRef(0);
  const lastEtaDriverPointRef = useRef<LatLng | null>(null);
  const passengers = Number(params.passengers) || 1;
  const distance = Number(params.distance) || 1;
  const estimatedPrice = Number(params.estimatedPrice) || distance * (vehicle?.pricePerKm ?? 0);
  const pickupLat = Number(params.pickupLat);
  const pickupLng = Number(params.pickupLng);
  const dropoffLat = Number(params.dropoffLat);
  const dropoffLng = Number(params.dropoffLng);
  const hasMap = [pickupLat, pickupLng, dropoffLat, dropoffLng].every(Number.isFinite);
  const existingBookingHasMap =
    booking &&
    [booking.pickupLat, booking.pickupLng, booking.dropoffLat, booking.dropoffLng].every((value) => typeof value === 'number');

  useEffect(() => {
    if (params.id) return;
    if (!params.vehicleId) return;
    apiClient
      .getVehicleById(params.vehicleId)
      .then(setVehicle)
      .catch((error) => showError('Không thể tải xe', error.message));
  }, [params.id, params.vehicleId]);

  useEffect(() => {
    if (!params.id) return undefined;

    const fetchBooking = () =>
      apiClient
        .getBookingById(params.id!)
        .then(setBooking)
        .catch((error) => showError('Không thể tải chuyến đi', error.message));

    fetchBooking();
    getDriverLocation(params.id).then(setDriverLocation).catch(() => undefined);

    const unsubscribeBooking = subscribeBookingStatus(params.id, (update) => {
      setBooking((current) => (current ? { ...current, ...update } : current));
      fetchBooking();
    });
    const unsubscribeLocation = subscribeDriverLocation(params.id, setDriverLocation);
    return () => {
      unsubscribeBooking();
      unsubscribeLocation();
    };
  }, [params.id]);

  useEffect(() => {
    if (booking?.status !== BOOKING_STATUS.SEARCHING_DRIVER) {
      setWaitingSeconds(0);
      return;
    }

    const startedAt = booking.createdAt ? new Date(booking.createdAt).getTime() : Date.now();
    setWaitingSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const timer = setInterval(() => {
      setWaitingSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.id, booking?.status, booking?.createdAt]);

  useEffect(() => {
    if (booking?.status !== BOOKING_STATUS.SEARCHING_DRIVER) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [booking?.status, pulseAnim]);

  useEffect(() => {
    const hasPickup =
      typeof booking?.pickupLat === 'number' &&
      typeof booking?.pickupLng === 'number';
    const isEtaStatus = !!booking?.status && ETA_ACTIVE_STATUSES.includes(booking.status as any);

    if (!booking || !driverLocation || !hasPickup || !isEtaStatus) {
      setDriverEta(null);
      setDriverEtaLoading(false);
      setDriverEtaError(null);
      lastEtaRequestAtRef.current = 0;
      lastEtaDriverPointRef.current = null;
      return;
    }

    const driverPoint: LatLng = {
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    };
    const pickupPoint: LatLng = {
      latitude: booking.pickupLat!,
      longitude: booking.pickupLng!,
    };
    const lastPoint = lastEtaDriverPointRef.current;
    const movedMeters = lastPoint ? getDistanceMeters(lastPoint, driverPoint) : Infinity;
    const requestAge = Date.now() - lastEtaRequestAtRef.current;

    if (requestAge < ETA_REFRESH_INTERVAL_MS && movedMeters < ETA_REFRESH_DISTANCE_METERS) {
      return;
    }

    let cancelled = false;
    setDriverEtaLoading(true);
    setDriverEtaError(null);

    getDrivingRoute(driverPoint, pickupPoint)
      .then((route) => {
        if (cancelled) return;
        lastEtaRequestAtRef.current = Date.now();
        lastEtaDriverPointRef.current = driverPoint;
        setDriverEta({
          text: route.durationSeconds ? formatEta(route.durationSeconds) : route.duration || 'đang cập nhật',
          distanceMeters: route.distanceMeters,
          updatedAt: new Date().toISOString(),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setDriverEtaError(error.message || 'Đang cập nhật ETA...');
      })
      .finally(() => {
        if (!cancelled) setDriverEtaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    booking?.id,
    booking?.status,
    booking?.pickupLat,
    booking?.pickupLng,
    booking,
    driverLocation?.latitude,
    driverLocation?.longitude,
    driverLocation,
  ]);

  const refreshBooking = () => {
    if (!params.id) return;
    apiClient
      .getBookingById(params.id)
      .then(setBooking)
      .catch((error) => showError('Không thể tải chuyến đi', error.message));
  };

  useEffect(() => {
    if (!booking || !user || booking.status !== BOOKING_STATUS.TRIP_COMPLETED) return;
    apiClient
      .getRatingForBooking(booking.id, user.id)
      .then(setRatingReview)
      .catch(() => undefined);
  }, [booking, user]);

  const handleConfirm = async () => {
    if (loading || submitted) return;
    if (!vehicle || !user) return;

    try {
      setLoading(true);
      const created = await apiClient.createBooking({
        customerId: user.id,
        customerName: user.fullName,
        customerPhone: user.phone,
        customerEmail: user.email,
        vehicleId: vehicle.id,
        vehicle,
        pickupLocation: params.pickupLocation || '',
        dropoffLocation: params.dropoffLocation || '',
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        date: params.date || '',
        time: params.time || '',
        passengers,
        note: params.note,
        estimatedPrice,
        distance,
      });
      setSubmitted(true);
      showSuccess('Đặt xe thành công', `Yêu cầu đặt ${vehicle.name} đã được lưu vào Supabase.`);
      router.replace({ pathname: '/(customer)/booking-detail' as any, params: { id: created.id } });
    } catch (error: any) {
      showError('Không thể đặt xe', error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!cancelReason) {
      showWarning('Chọn lý do hủy', 'Vui lòng chọn một lý do trước khi hủy chuyến.');
      return;
    }

    try {
      setLoading(true);
      const updated = await apiClient.cancelBooking(booking.id, cancelReason);
      setBooking(updated);
      showSuccess('Đã hủy chuyến', 'Lý do hủy đã được lưu vào lịch sử chuyến đi.');
    } catch (error: any) {
      showError('Không thể hủy chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!booking || !user || !booking.driverId) return;
    try {
      setLoading(true);
      const created = await apiClient.createRating({
        bookingId: booking.id,
        fromUserId: user.id,
        toUserId: booking.driverId,
        rating,
        comment: ratingComment,
      });
      setRatingReview(created);
      showSuccess('Đã gửi đánh giá', 'Cảm ơn bạn đã đánh giá tài xế sau chuyến đi.');
    } catch (error: any) {
      showError('Không thể gửi đánh giá', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (params.id) {
    if (!booking) {
      return (
        <Screen padding>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải chuyến đi...</Text>
        </Screen>
      );
    }

    return (
      <Screen scroll>
        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
            {booking.bookingCode ?? 'Chuyến đi'}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {getBookingStatusInfo(booking.status).label} - {booking.time} - {formatVietnamDate(booking.date)}
          </Text>
        </DetailSection>

        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>
            Trạng thái chuyến đi
          </Text>
          <BookingTimeline status={booking.status} />
        </DetailSection>

        {booking.status === BOOKING_STATUS.SEARCHING_DRIVER && (
          <DetailSection style={{ alignItems: 'center' }}>
            <Animated.View
              style={{
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: colors.primary,
                opacity: pulseAnim,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Car size={34} color="white" />
            </Animated.View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
              Đang tìm tài xế gần bạn...
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 }}>
              Hệ thống đang gửi yêu cầu đến tài xế phù hợp. Thời gian đã chờ: {Math.floor(waitingSeconds / 60)}:
              {String(waitingSeconds % 60).padStart(2, '0')}
            </Text>
            <Button
              label="Làm mới trạng thái"
              onPress={refreshBooking}
              variant="outline"
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </DetailSection>
        )}

        {/* Cảnh báo chờ quá lâu — hiện sau 5 phút */}
        {booking.status === BOOKING_STATUS.SEARCHING_DRIVER && waitingSeconds > 300 && (
          <DetailSection
            style={{
              borderWidth: 1.5,
              borderColor: colors.warning,
              backgroundColor: colors.warning + '10',
            }}
          >
            <Text
              style={{
                color: colors.warning,
                fontSize: 16,
                fontWeight: '900',
                marginBottom: spacing.sm,
              }}
            >
              ⚠️ Đã chờ quá lâu
            </Text>
            <Text style={{ color: colors.text, lineHeight: 21, marginBottom: spacing.md }}>
              Hệ thống chưa tìm được tài xế phù hợp sau {Math.floor(waitingSeconds / 60)} phút. Bạn có thể hủy và đặt lại sau.
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Hủy chuyến này"
                onPress={() => {
                  setCancelReason('Không tìm được tài xế');
                }}
                variant="danger"
                size="sm"
              />
              <Button
                label="Tiếp tục chờ"
                onPress={refreshBooking}
                variant="outline"
                size="sm"
              />
            </View>
          </DetailSection>
        )}

        {!!booking.driverId && ETA_ACTIVE_STATUSES.includes(booking.status as any) && (
          <DetailSection>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
              Tài xế đang đến điểm đón
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              {/* Avatar tài xế: dùng ảnh thật nếu có, fallback chữ cái */}
              {booking.vehicle?.driverAvatar ? (
                <Image
                  source={{ uri: booking.vehicle.driverAvatar }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 2,
                    borderColor: colors.primary + '40',
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 20 }}>
                    {(booking.driverName || 'T')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: fontSize.base }}>
                  {booking.driverName || 'Tài xế'}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                  {booking.driverPhone || 'Chưa có số điện thoại'}
                </Text>
                {!!booking.vehicle && (
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                    {booking.vehicle.name} - {booking.vehicle.licensePlate} - {booking.vehicle.color}
                  </Text>
                )}
              </View>
            </View>
            <View
              style={{
                padding: spacing.md,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceAlt,
                gap: spacing.xs,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {driverEtaLoading && !driverEta
                  ? 'Đang tính ETA theo lộ trình Goong...'
                  : driverEta
                    ? `Tài xế dự kiến đến trong ${driverEta.text}`
                    : driverEtaError || 'Đang cập nhật ETA...'}
              </Text>
              {driverEta && (
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  Khoảng cách còn {(driverEta.distanceMeters / 1000).toFixed(1)} km. ETA được cập nhật khi tài xế di chuyển.
                </Text>
              )}
              {!driverLocation && (
                <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>
                  Tài xế chưa bật chia sẻ GPS nên chưa tính được ETA.
                </Text>
              )}
            </View>
          </DetailSection>
        )}

        {existingBookingHasMap && (
          <DetailSection>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
              Theo dõi tài xế realtime
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
              {driverLocation ? 'Vị trí tài xế đang được cập nhật trực tiếp.' : 'Tài xế chưa bật chia sẻ GPS.'}
            </Text>
            <LazyMount minHeight={320} label="Đang tải bản đồ realtime...">
              <RealtimeTripMap
                pickup={{ label: booking.pickupLocation, latitude: booking.pickupLat!, longitude: booking.pickupLng! }}
                dropoff={{ label: booking.dropoffLocation, latitude: booking.dropoffLat!, longitude: booking.dropoffLng! }}
                driverLocation={driverLocation}
                bookingStatus={booking.status}
                showControls={false}
              />
            </LazyMount>
          </DetailSection>
        )}

        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>
            Thông tin chuyến đi
          </Text>
          {[
            { icon: <MapPin size={18} color={colors.primary} />, label: 'Điểm đón', value: booking.pickupLocation },
            { icon: <Navigation size={18} color={colors.error} />, label: 'Điểm đến', value: booking.dropoffLocation },
            { icon: <Clock size={18} color={colors.info} />, label: 'Thời gian', value: `${booking.time} - ${formatVietnamDate(booking.date)}` },
            { icon: <Car size={18} color={colors.primary} />, label: 'Tài xế', value: booking.driverName || 'Đang chờ xác nhận' },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
              {item.icon}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
                <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.xs }}>{item.value}</Text>
              </View>
            </View>
          ))}
        </DetailSection>

        <DetailSection>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Thanh toán</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {(booking.actualPrice ?? booking.estimatedPrice).toLocaleString('vi-VN')} VND
              </Text>
            </View>
            <PaymentStatusBadge status={booking.paymentStatus} />
          </View>
          <Text style={{ color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md }}>
            {booking.driverId
              ? `Trạng thái hiện tại: ${getPaymentStatusLabel(booking.paymentStatus)}. Bạn có thể chọn tiền mặt hoặc VietQR/chuyển khoản.`
              : 'Chuyến đi chưa có tài xế nhận nên chưa thể chọn thanh toán.'}
          </Text>
          <Button
            label={booking.paymentStatus === 'paid' ? 'Xem thanh toán' : 'Thanh toán'}
            onPress={() => router.push({ pathname: '/(customer)/payment' as any, params: { bookingId: booking.id } })}
            disabled={!booking.driverId}
            variant={booking.paymentStatus === 'paid' ? 'outline' : 'primary'}
          />
        </DetailSection>

        {!!booking.cancelReason && (
          <DetailSection style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
              Lý do hủy chuyến
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
              {booking.cancelReason}
            </Text>
          </DetailSection>
        )}

        {[BOOKING_STATUS.SEARCHING_DRIVER, BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.DRIVER_ARRIVING, BOOKING_STATUS.DRIVER_ARRIVED].includes(booking.status as any) && (
          <DetailSection>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
              Hủy chuyến
            </Text>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
              Chọn lý do để tài xế và hệ thống chăm sóc khách hàng nắm được tình huống.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {CUSTOMER_CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setCancelReason(reason)}
                  style={{
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: borderRadius.full,
                    backgroundColor: cancelReason === reason ? colors.error : colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: cancelReason === reason ? 'white' : colors.text, fontWeight: '700', fontSize: fontSize.sm }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              label="Hủy chuyến"
              onPress={handleCancelBooking}
              loading={loading}
              disabled={loading}
              variant="danger"
            />
          </DetailSection>
        )}

        {booking.status === BOOKING_STATUS.TRIP_COMPLETED && !!booking.driverId && (
          <DetailSection>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md }}>
              <FileText size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
                  Biên nhận chuyến đi
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                  Xem lại lộ trình, tài xế, xe, thanh toán và tổng tiền sau chuyến.
                </Text>
              </View>
            </View>
            <Button
              label="Xem biên nhận"
              onPress={() => router.push({ pathname: '/(customer)/receipt' as any, params: { bookingId: booking.id } })}
              variant="outline"
            />
          </DetailSection>
        )}

        {booking.status === BOOKING_STATUS.TRIP_COMPLETED && !!booking.driverId && (
          <DetailSection>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
              Đánh giá tài xế
            </Text>
            {ratingReview ? (
              <>
                <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={22}
                      color={colors.warning}
                      fill={index < ratingReview.rating ? colors.warning : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={{ color: colors.textSecondary }}>
                  {ratingReview.comment || 'Bạn đã đánh giá chuyến đi này.'}
                </Text>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <TouchableOpacity key={value} onPress={() => setRating(value)}>
                        <Star
                          size={30}
                          color={colors.warning}
                          fill={value <= rating ? colors.warning : 'transparent'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  label="Nhận xét"
                  placeholder="Tài xế đúng giờ, xe sạch, thái độ tốt..."
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  numberOfLines={3}
                  style={{ marginBottom: spacing.md }}
                />
                <Button label="Gửi đánh giá" onPress={submitRating} loading={loading} disabled={loading} />
              </>
            )}
          </DetailSection>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md }}>
          Tóm tắt chuyến đi
        </Text>
        {[
          { icon: <MapPin size={18} color={colors.primary} />, label: 'Điểm đón', value: params.pickupLocation || 'Chưa có' },
          { icon: <Navigation size={18} color={colors.error} />, label: 'Điểm đến', value: params.dropoffLocation || 'Chưa có' },
          { icon: <Clock size={18} color={colors.info} />, label: 'Thời gian', value: `${params.time || '--:--'} - ${formatVietnamDate(params.date)}` },
          { icon: <User size={18} color={colors.warning} />, label: 'Hành khách', value: `${passengers} người` },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            {item.icon}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.xs }}>{item.value}</Text>
            </View>
          </View>
        ))}
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Bản đồ hành trình
        </Text>
        {hasMap ? (
          <LazyMount minHeight={260} label="Đang tải bản đồ hành trình...">
            <MapPreview
              pickup={{ label: params.pickupLocation || 'Điểm đón', lat: pickupLat, lng: pickupLng }}
              dropoff={{ label: params.dropoffLocation || 'Điểm đến', lat: dropoffLat, lng: dropoffLng }}
              showControls={false}
            />
          </LazyMount>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
          <Text style={{ color: colors.textSecondary }}>
            <Route size={14} color={colors.textSecondary} /> {distance} km
          </Text>
          <Text style={{ color: colors.textSecondary }}>{params.routeDuration ? `Dự kiến ${params.routeDuration}` : 'Dự kiến theo Goong'}</Text>
        </View>
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Tài xế và xe
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Car size={24} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{vehicle?.name ?? 'Đang tải xe'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {vehicle?.licensePlate} - {vehicle?.color} - {vehicle?.seats} chỗ
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <User size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Tài xế sẽ xác nhận</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Hệ thống sẽ thông báo realtime khi có cập nhật booking
            </Text>
          </View>
          <Phone size={18} color={colors.primary} />
        </View>
      </DetailSection>

      <DetailSection>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Thanh toán
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Banknote size={26} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Tiền mặt</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Thanh toán trực tiếp cho tài xế sau chuyến đi
            </Text>
          </View>
          <CheckCircle2 size={22} color={colors.success} />
        </View>
        <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '800' }}>
          {estimatedPrice.toLocaleString('vi-VN')} VND
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
          Giá đã bao gồm phí nền tảng và phụ phí giờ cao điểm nếu có. Khoảng cách lấy theo lộ trình Goong thực tế.
        </Text>
      </DetailSection>

      {!!params.note && (
        <DetailSection>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
            Ghi chú cho tài xế
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{params.note}</Text>
        </DetailSection>
      )}

      <View style={{ paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
        <Button
          label={submitted ? 'Đã gửi yêu cầu' : 'Xác nhận đặt xe'}
          onPress={handleConfirm}
          loading={loading}
          disabled={!vehicle || loading || submitted}
        />
      </View>
    </Screen>
  );
}
