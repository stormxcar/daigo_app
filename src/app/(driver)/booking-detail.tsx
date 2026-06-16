import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Banknote, Car, Clock, Mail, MapPin, Navigation, Phone, Route, User, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Badge, Button, Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { RealtimeTripMap } from '@/components/RealtimeTripMap';
import { apiClient } from '@/services/api';
import {
  getDistanceMeters,
  getDriverLocation,
  startDriverLocationWatch,
  subscribeDriverLocation,
  upsertDriverLocation,
} from '@/services/driverLocation';
import { useAuthStore } from '@/stores/authStore';
import { Booking, DriverLocation, TripPhase } from '@/types';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { openExternalDirections } from '@/services/externalMapsUrlService';
import { getCurrentLatLng } from '@/services/locationService';
import { showError, showInfo, showSuccess, showWarning } from '@/utils/toast';

export default function DriverBookingDetail() {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [tripPhase, setTripPhase] = useState<TripPhase>('pickup');
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const watchRef = useRef<{ remove: () => void } | null>(null);

  const loadBooking = async () => {
    if (!id) return;
    try {
      const data = await apiClient.getBookingById(id);
      setBooking(data);
      const location = await getDriverLocation(id).catch(() => null);
      if (location) {
        setDriverLocation(location);
        setTripPhase(location.phase);
      }
    } catch (error: any) {
      showError('Không thể tải chuyến đi', error.message);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const unsubscribe = subscribeDriverLocation(id, (location) => {
      setDriverLocation(location);
      setTripPhase(location.phase);
    });
    return () => {
      unsubscribe();
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [id]);

  const acceptBooking = async () => {
    if (!booking || !user) return;
    try {
      setLoading(true);
      const updated = await apiClient.acceptBooking(booking.id, user.id);
      setBooking(updated);
      showSuccess('Đã xác nhận chuyến', 'Khách hàng sẽ nhận được thông báo realtime.');
    } catch (error: any) {
      showError('Không thể xác nhận chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      const updated = await apiClient.cancelBookingByDriver(booking.id);
      setBooking(updated);
      showSuccess('Đã hủy chuyến', 'Khách hàng sẽ nhận được thông báo.');
    } catch (error: any) {
      showError('Không thể hủy chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markArriving = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      const updated = await apiClient.markDriverArriving(booking.id);
      setBooking(updated);
      await startTrackingGps('pickup');
    } catch (error: any) {
      showError('Không thể cập nhật chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markArrived = async () => {
    if (!booking) return;
    const distanceToPickup =
      driverLocation && typeof booking.pickupLat === 'number' && typeof booking.pickupLng === 'number'
        ? getDistanceMeters(
            { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
            { latitude: booking.pickupLat, longitude: booking.pickupLng }
          )
        : null;

    if (distanceToPickup !== null && distanceToPickup > 100) {
      showWarning('Bạn chưa ở gần điểm đón', 'Vui lòng đến gần điểm đón để xác nhận đã tới nơi.');
      return;
    }

    try {
      setLoading(true);
      const updated = await apiClient.markDriverArrived(booking.id);
      setBooking(updated);
    } catch (error: any) {
      showError('Không thể cập nhật chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startTrip = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      const updated = await apiClient.startTrip(booking.id);
      setBooking(updated);
      await markPickupReached();
    } catch (error: any) {
      showError('Không thể bắt đầu chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNavigationDestination = () => {
    if (!booking) return null;
    if (booking.status === BOOKING_STATUS.TRIP_STARTED) {
      if (typeof booking.dropoffLat !== 'number' || typeof booking.dropoffLng !== 'number') return null;
      return { latitude: booking.dropoffLat, longitude: booking.dropoffLng };
    }

    if (typeof booking.pickupLat !== 'number' || typeof booking.pickupLng !== 'number') return null;
    return { latitude: booking.pickupLat, longitude: booking.pickupLng };
  };

  const openExternalNavigation = async () => {
    try {
      showInfo('Đang mở app bản đồ...');
      const origin = driverLocation
        ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
        : await getCurrentLatLng();
      const destination = getNavigationDestination();
      if (!destination) {
        throw new Error('Tọa độ điểm đến không hợp lệ.');
      }
      await openExternalDirections(origin, destination);
    } catch (error: any) {
      showError('Không thể mở app bản đồ', error.message || 'Vui lòng thử lại.');
    }
  };

  const startTrackingGps = async (phase: TripPhase = tripPhase) => {
    if (!booking || !user) return;
    if (![BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.DRIVER_ARRIVING, BOOKING_STATUS.DRIVER_ARRIVED, BOOKING_STATUS.TRIP_STARTED].includes(booking.status as any)) {
      showWarning('Chưa thể chia sẻ GPS', 'Bạn cần xác nhận chuyến trước khi bắt đầu di chuyển.');
      return;
    }

    try {
      watchRef.current?.remove();
      const subscription = await startDriverLocationWatch(booking.id, user.id, phase, (location) => {
        setDriverLocation(location);
        setTripPhase(location.phase);
      });
      watchRef.current = subscription;
      setTracking(true);
      showSuccess('Đã bật GPS realtime', 'Vị trí tài xế sẽ được cập nhật theo thiết bị.');
    } catch (error: any) {
      showError('Không thể bật GPS realtime', error.message);
    }
  };

  const markPickupReached = async () => {
    if (!booking || !user || !driverLocation) return;
    try {
      const location = await upsertDriverLocation({
        bookingId: booking.id,
        driverId: user.id,
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        heading: driverLocation.heading,
        speed: driverLocation.speed,
        accuracy: driverLocation.accuracy,
        phase: 'dropoff',
      });
      setDriverLocation(location);
      setTripPhase('dropoff');
      await startTrackingGps('dropoff');
    } catch (error: any) {
      showError('Không thể chuyển lộ trình', error.message);
    }
  };

  const completeBooking = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      watchRef.current?.remove();
      watchRef.current = null;
      setTracking(false);
      const updated = await apiClient.completeBooking(booking.id);
      setBooking(updated);
      showSuccess('Đã hoàn thành chuyến', 'Khách hàng sẽ nhận được thông báo hoàn thành.');
    } catch (error: any) {
      showError('Không thể hoàn thành chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCompleteBooking = () => {
    if (!booking) return;
    const distanceToDropoff =
      driverLocation && typeof booking.dropoffLat === 'number' && typeof booking.dropoffLng === 'number'
        ? getDistanceMeters(
            { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
            { latitude: booking.dropoffLat, longitude: booking.dropoffLng }
          )
        : null;

    if (distanceToDropoff !== null && distanceToDropoff > 150) {
      Alert.alert(
        'GPS chưa sát điểm đến',
        `Bạn còn cách điểm đến khoảng ${Math.round(distanceToDropoff)}m. Vẫn xác nhận hoàn thành chuyến?`,
        [
          { text: 'Chưa', style: 'cancel' },
          { text: 'Vẫn hoàn thành', onPress: completeBooking },
        ]
      );
      return;
    }

    completeBooking();
  };

  if (!booking) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải chi tiết chuyến đi...</Text>
      </Screen>
    );
  }

  const hasMap = [booking.pickupLat, booking.pickupLng, booking.dropoffLat, booking.dropoffLng].every((value) => typeof value === 'number');
  const statusInfo = getBookingStatusInfo(booking.status);
  const statusVariant =
    booking.status === BOOKING_STATUS.TRIP_COMPLETED
      ? 'success'
      : TERMINAL_BOOKING_STATUSES.includes(booking.status as any)
        ? 'error'
        : booking.status === BOOKING_STATUS.SEARCHING_DRIVER
          ? 'warning'
          : 'info';

  return (
    <Screen scroll>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
              {booking.bookingCode ?? 'Chi tiết chuyến đi'}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {booking.time} - {formatVietnamDate(booking.date)}
            </Text>
          </View>
          <Badge label={statusInfo.label} variant={statusVariant} />
        </View>

        {[
          { icon: <MapPin size={18} color={colors.primary} />, label: 'Điểm đón', value: booking.pickupLocation },
          { icon: <Navigation size={18} color={colors.error} />, label: 'Điểm đến', value: booking.dropoffLocation },
          { icon: <Clock size={18} color={colors.info} />, label: 'Thời gian', value: `${booking.time} - ${formatVietnamDate(booking.date)}` },
          { icon: <Users size={18} color={colors.warning} />, label: 'Số khách', value: `${booking.passengers} người` },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            {item.icon}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
              <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.xs }}>{item.value}</Text>
            </View>
          </View>
        ))}
      </Card>

      {hasMap && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm }}>Bản đồ realtime</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {tripPhase === 'pickup'
              ? 'Bản đồ Goong hiển thị lộ trình trong app đến điểm đón. Bật GPS realtime để marker tài xế di chuyển theo vị trí thật.'
              : 'Bản đồ Goong hiển thị lộ trình trong app đến điểm đến.'}
          </Text>
          <RealtimeTripMap
            pickup={{ label: booking.pickupLocation, latitude: booking.pickupLat!, longitude: booking.pickupLng! }}
            dropoff={{ label: booking.dropoffLocation, latitude: booking.dropoffLat!, longitude: booking.dropoffLng! }}
            driverLocation={driverLocation}
            bookingStatus={booking.status}
            onExpand={() => setMapExpanded(true)}
            onOpenExternalMap={openExternalNavigation}
          />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>
            <Route size={14} color={colors.textSecondary} /> {booking.distance ?? '--'} km
          </Text>
          {[BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.DRIVER_ARRIVING, BOOKING_STATUS.DRIVER_ARRIVED, BOOKING_STATUS.TRIP_STARTED].includes(booking.status as any) && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                label={tracking ? 'Đang chia sẻ GPS realtime' : 'Bắt đầu chia sẻ GPS'}
                onPress={() => startTrackingGps()}
                variant={tracking ? 'outline' : 'primary'}
              />
              {tripPhase === 'pickup' && (
                <Button
                  label="Đã đón khách"
                  onPress={markPickupReached}
                  disabled={!driverLocation}
                  variant="outline"
                />
              )}
            </View>
          )}
        </Card>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>Thông tin khách hàng</Text>
        {[
          { icon: <User size={18} color={colors.primary} />, label: booking.customerName || 'Chưa có tên' },
          { icon: <Phone size={18} color={colors.primary} />, label: booking.customerPhone || 'Chưa có số điện thoại' },
          { icon: <Mail size={18} color={colors.primary} />, label: booking.customerEmail || 'Chưa có email' },
        ].map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md }}>
            {item.icon}
            <Text style={{ color: colors.text, flex: 1 }}>{item.label}</Text>
          </View>
        ))}
        {!!booking.note && (
          <View style={{ padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.xs }}>Ghi chú của khách</Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>{booking.note}</Text>
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>Xe và thanh toán</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <Car size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{booking.vehicle?.name}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {booking.vehicle?.licensePlate} - {booking.vehicle?.color} - {booking.vehicle?.seats} chỗ
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Banknote size={22} color={colors.success} />
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>
            {(booking.actualPrice ?? booking.estimatedPrice).toLocaleString('vi-VN')} VND
          </Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {booking.status === BOOKING_STATUS.SEARCHING_DRIVER && (
          <Button label="Nhận chuyến" onPress={acceptBooking} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {booking.status === BOOKING_STATUS.DRIVER_ACCEPTED && (
          <Button label="Tôi đang tới" onPress={markArriving} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {booking.status === BOOKING_STATUS.DRIVER_ARRIVING && (
          <Button label="Đã tới nơi" onPress={markArrived} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {booking.status === BOOKING_STATUS.DRIVER_ARRIVED && (
          <Button label="Bắt đầu chuyến" onPress={startTrip} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {booking.status === BOOKING_STATUS.TRIP_STARTED && (
          <Button label="Hoàn thành" onPress={confirmCompleteBooking} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {[BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.DRIVER_ARRIVING, BOOKING_STATUS.DRIVER_ARRIVED].includes(booking.status as any) && (
          <Button label="Hủy chuyến" onPress={cancelBooking} loading={loading} disabled={loading} variant="danger" style={{ flex: 1 }} />
        )}
      </View>

      {hasMap && (
        <Modal visible={mapExpanded} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setMapExpanded(false)}>
          <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg }}>
            <RealtimeTripMap
              pickup={{ label: booking.pickupLocation, latitude: booking.pickupLat!, longitude: booking.pickupLng! }}
              dropoff={{ label: booking.dropoffLocation, latitude: booking.dropoffLat!, longitude: booking.dropoffLng! }}
              driverLocation={driverLocation}
              bookingStatus={booking.status}
              expanded
              height={Math.max(420, windowHeight - 230)}
              onExpand={() => setMapExpanded(false)}
              onOpenExternalMap={openExternalNavigation}
            />
            <View style={{ padding: spacing.lg }}>
              <Button label="Đóng bản đồ" onPress={() => setMapExpanded(false)} variant="outline" />
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}
