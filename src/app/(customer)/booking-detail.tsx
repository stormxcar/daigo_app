import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Banknote, Car, CheckCircle2, Clock, MapPin, Navigation, Phone, Route, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { MOCK_DRIVER, MOCK_VEHICLES } from '@/services/mockData';

export default function BookingDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    vehicleId?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    date?: string;
    time?: string;
    passengers?: string;
  }>();

  const vehicle = MOCK_VEHICLES.find((item) => item.id === params.vehicleId) ?? MOCK_VEHICLES[0];
  const passengers = Number(params.passengers) || 1;
  const distance = vehicle.seats >= 7 ? 28 : 22;
  const estimatedPrice = distance * vehicle.pricePerKm;

  const handleConfirm = () => {
    Alert.alert(
      'Đặt xe thành công',
      `Yêu cầu đặt ${vehicle.name} đã được gửi đến tài xế ${MOCK_DRIVER.name}.`,
      [{ text: 'Về trang chủ', onPress: () => router.replace('/(customer)/home') }]
    );
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
        <View
          style={{
            height: 190,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.surfaceAlt,
            padding: spacing.lg,
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MapPin size={22} color={colors.primary} />
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
              {params.pickupLocation || 'Điểm đón'}
            </Text>
          </View>
          <View style={{ marginLeft: 10, height: 70, borderLeftWidth: 3, borderLeftColor: colors.primary }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MapPin size={22} color={colors.error} />
            <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
              {params.dropoffLocation || 'Điểm đến'}
            </Text>
          </View>
        </View>
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
            <Text style={{ color: colors.text, fontWeight: '700' }}>{vehicle.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {vehicle.licensePlate} - {vehicle.color} - {vehicle.seats} chỗ
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <User size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{MOCK_DRIVER.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {MOCK_DRIVER.rating} sao - {MOCK_DRIVER.experienceYears} năm kinh nghiệm
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

      <Button label="Xác nhận đặt xe" onPress={handleConfirm} />
    </Screen>
  );
}
