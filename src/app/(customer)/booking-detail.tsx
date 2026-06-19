import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Car, CheckCircle2, Clock, MapPin, Navigation, Phone, Route, Star, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Booking, DriverLocation, RatingReview, Vehicle } from '@/types';
import { MapPreview } from '@/components/MapPreview';
import { RealtimeTripMap } from '@/components/RealtimeTripMap';
import { BookingTimeline } from '@/components/BookingTimeline';
import { LazyMount } from '@/components/LazyMount';
import { PaymentStatusBadge, getPaymentStatusLabel } from '@/components/PaymentStatusBadge';
import { getDriverLocation, subscribeDriverLocation } from '@/services/driverLocation';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { BOOKING_STATUS, CUSTOMER_CANCEL_REASONS } from '@/constants';
import { showError, showSuccess, showWarning } from '@/utils/toast';

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

    apiClient
      .getBookingById(params.id)
      .then(setBooking)
      .catch((error) => showError('Không thể tải chuyến đi', error.message));
    getDriverLocation(params.id).then(setDriverLocation).catch(() => undefined);

    const unsubscribe = subscribeDriverLocation(params.id, setDriverLocation);
    return unsubscribe;
  }, [params.id]);

  useEffect(() => {
    if (!booking || !user || booking.status !== BOOKING_STATUS.TRIP_COMPLETED) return;
    apiClient
      .getRatingForBooking(booking.id, user.id)
      .then(setRatingReview)
      .catch(() => undefined);
  }, [booking?.id, booking?.status, user?.id]);

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
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing.sm }}>
            {booking.bookingCode ?? 'Chuyến đi'}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {getBookingStatusInfo(booking.status).label} - {booking.time} - {formatVietnamDate(booking.date)}
          </Text>
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>
            Trạng thái chuyến đi
          </Text>
          <BookingTimeline status={booking.status} />
        </Card>

        {existingBookingHasMap && (
          <Card style={{ marginBottom: spacing.lg }}>
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
          </Card>
        )}

        <Card style={{ marginBottom: spacing.lg }}>
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
        </Card>

        <Card style={{ marginBottom: spacing.lg }}>
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
        </Card>

        {!!booking.cancelReason && (
          <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>
              Lý do hủy chuyến
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
              {booking.cancelReason}
            </Text>
          </Card>
        )}

        {[BOOKING_STATUS.SEARCHING_DRIVER, BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.DRIVER_ARRIVING, BOOKING_STATUS.DRIVER_ARRIVED].includes(booking.status as any) && (
          <Card style={{ marginBottom: spacing.lg }}>
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
          </Card>
        )}

        {booking.status === BOOKING_STATUS.TRIP_COMPLETED && !!booking.driverId && (
          <Card style={{ marginBottom: spacing.lg }}>
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
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Card style={{ marginBottom: spacing.lg }}>
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
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
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
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
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
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
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
      </Card>

      {!!params.note && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
            Ghi chú cho tài xế
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{params.note}</Text>
        </Card>
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
