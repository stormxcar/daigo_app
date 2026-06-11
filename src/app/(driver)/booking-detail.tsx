import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Banknote, Car, Clock, Mail, MapPin, Navigation, Phone, Route, User, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Badge, Button, Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { MapPreview } from '@/components/MapPreview';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';

export default function DriverBookingDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBooking = async () => {
    if (!id) return;
    try {
      const data = await apiClient.getBookingById(id);
      setBooking(data);
    } catch (error: any) {
      Alert.alert('Không thể tải chuyến đi', error.message);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [id]);

  const acceptBooking = async () => {
    if (!booking || !user) return;
    try {
      setLoading(true);
      const updated = await apiClient.acceptBooking(booking.id, user.id);
      setBooking(updated);
      Alert.alert('Đã xác nhận chuyến', 'Khách hàng sẽ nhận được thông báo realtime.');
    } catch (error: any) {
      Alert.alert('Không thể xác nhận chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    if (!booking) return;
    try {
      setLoading(true);
      const updated = await apiClient.cancelBooking(booking.id);
      setBooking(updated);
      Alert.alert('Đã hủy chuyến', 'Khách hàng sẽ nhận được thông báo.');
    } catch (error: any) {
      Alert.alert('Không thể hủy chuyến', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải chi tiết chuyến đi...</Text>
      </Screen>
    );
  }

  const hasMap = [booking.pickupLat, booking.pickupLng, booking.dropoffLat, booking.dropoffLng].every((value) => typeof value === 'number');

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
              {booking.bookingCode ?? 'Chi tiết chuyến đi'}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {booking.time} - {booking.date}
            </Text>
          </View>
          <Badge label={booking.status} variant={booking.status === 'Đã xác nhận' ? 'info' : booking.status === 'Hoàn thành' ? 'success' : booking.status === 'Đã hủy' ? 'error' : 'warning'} />
        </View>

        {[
          { icon: <MapPin size={18} color={colors.primary} />, label: 'Điểm đón', value: booking.pickupLocation },
          { icon: <Navigation size={18} color={colors.error} />, label: 'Điểm đến', value: booking.dropoffLocation },
          { icon: <Clock size={18} color={colors.info} />, label: 'Thời gian', value: `${booking.time} - ${booking.date}` },
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
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>Bản đồ hành trình</Text>
          <MapPreview
            pickup={{ label: booking.pickupLocation, lat: booking.pickupLat!, lng: booking.pickupLng! }}
            dropoff={{ label: booking.dropoffLocation, lat: booking.dropoffLat!, lng: booking.dropoffLng! }}
            followUser
          />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>
            <Route size={14} color={colors.textSecondary} /> {booking.distance ?? '--'} km
          </Text>
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
        {booking.status === 'Chờ xác nhận' && (
          <Button label="Xác nhận" onPress={acceptBooking} loading={loading} disabled={loading} style={{ flex: 1 }} />
        )}
        {booking.status !== 'Đã hủy' && booking.status !== 'Hoàn thành' && (
          <Button label="Hủy chuyến" onPress={cancelBooking} loading={loading} disabled={loading} variant="danger" style={{ flex: 1 }} />
        )}
      </View>
    </Screen>
  );
}
