import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Car, CheckCircle2, Clock, MapPin, Navigation, Phone, Route, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Vehicle } from '@/types';
import { MapPreview } from '@/components/MapPreview';

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
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
    note?: string;
  }>();

  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const passengers = Number(params.passengers) || 1;
  const distance = Number(params.distance) || 1;
  const estimatedPrice = distance * (vehicle?.pricePerKm ?? 0);
  const pickupLat = Number(params.pickupLat);
  const pickupLng = Number(params.pickupLng);
  const dropoffLat = Number(params.dropoffLat);
  const dropoffLng = Number(params.dropoffLng);
  const hasMap = [pickupLat, pickupLng, dropoffLat, dropoffLng].every(Number.isFinite);

  useEffect(() => {
    if (!params.vehicleId) return;
    apiClient
      .getVehicleById(params.vehicleId)
      .then(setVehicle)
      .catch((error) => Alert.alert('Không thể tải xe', error.message));
  }, [params.vehicleId]);

  const handleConfirm = async () => {
    if (loading || submitted) return;
    if (!vehicle || !user) return;

    try {
      setLoading(true);
      await apiClient.createBooking({
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
      Alert.alert(
        'Đặt xe thành công',
        `Yêu cầu đặt ${vehicle.name} đã được lưu vào Supabase.`,
        [{ text: 'Về trang chủ', onPress: () => router.replace('/(customer)/home') }]
      );
      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Không thể đặt xe', error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md }}>
          Tóm tắt chuyến đi
        </Text>
        {[
          { icon: <MapPin size={18} color={colors.primary} />, label: 'Điểm đón', value: params.pickupLocation || 'Chưa có' },
          { icon: <Navigation size={18} color={colors.error} />, label: 'Điểm đến', value: params.dropoffLocation || 'Chưa có' },
          { icon: <Clock size={18} color={colors.info} />, label: 'Thời gian', value: `${params.time || '--:--'} - ${params.date || '--'}` },
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
          <MapPreview
            pickup={{ label: params.pickupLocation || 'Điểm đón', lat: pickupLat, lng: pickupLng }}
            dropoff={{ label: params.dropoffLocation || 'Điểm đến', lat: dropoffLat, lng: dropoffLng }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
          <Text style={{ color: colors.textSecondary }}>
            <Route size={14} color={colors.textSecondary} /> {distance} km
          </Text>
          <Text style={{ color: colors.textSecondary }}>Dự kiến 35-45 phút</Text>
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
