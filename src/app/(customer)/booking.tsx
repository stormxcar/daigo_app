import React, { useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Calendar, Car, Clock, MapPin, Search, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, TextInput } from '@/components/BaseComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { Screen } from '@/components/ScreenComponents';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_BOOKINGS, MOCK_VEHICLES } from '@/services/mockData';
import { Vehicle } from '@/types';

type SortMode = 'price_asc' | 'price_desc' | 'seats_desc';

const quickTimes = ['07:00', '09:00', '12:00', '15:00', '18:00', '20:00'];
const sortOptions: { label: string; value: SortMode }[] = [
  { label: 'Giá thấp', value: 'price_asc' },
  { label: 'Giá cao', value: 'price_desc' },
  { label: 'Nhiều chỗ', value: 'seats_desc' },
];

export default function BookingScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuthStore();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [date, setDate] = useState('2026-06-12');
  const [time, setTime] = useState('09:00');
  const [passengers, setPassengers] = useState('2');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('price_asc');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const passengerCount = Math.max(Number(passengers) || 1, 1);

  const vehicleAvailability = (vehicle: Vehicle) => {
    if (vehicle.status !== 'Sẵn sàng') return false;

    return !MOCK_BOOKINGS.some(
      (booking) =>
        booking.vehicleId === vehicle.id &&
        booking.date === date &&
        booking.time === time &&
        booking.status !== 'Đã hủy'
    );
  };

  const vehicles = useMemo(() => {
    const priceLimit = Number(maxPrice) || Infinity;

    return MOCK_VEHICLES
      .filter((vehicle) => vehicle.seats >= passengerCount)
      .filter((vehicle) => vehicle.pricePerKm <= priceLimit)
      .filter((vehicle) => !onlyAvailable || vehicleAvailability(vehicle))
      .sort((a, b) => {
        if (sortMode === 'price_desc') return b.pricePerKm - a.pricePerKm;
        if (sortMode === 'seats_desc') return b.seats - a.seats;
        return a.pricePerKm - b.pricePerKm;
      });
  }, [date, time, passengerCount, maxPrice, onlyAvailable, sortMode]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  const handleSearch = () => {
    if (!pickupLocation || !dropoffLocation || !date || !time || !passengers) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập điểm đón, điểm đến, ngày, giờ và số người.');
      return;
    }

    setSearched(true);
    setSelectedVehicleId(vehicles[0]?.id ?? null);
  };

  const handleCreateBooking = () => {
    if (!selectedVehicle) {
      Alert.alert('Chưa chọn xe', 'Vui lòng chọn một xe phù hợp trước khi đặt.');
      return;
    }

    Alert.alert(
      'Đã gửi yêu cầu đặt xe',
      `Xe ${selectedVehicle.name} sẽ đón ${passengerCount} hành khách lúc ${time} ngày ${date}.`
    );
  };

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để đặt xe và xem lịch sử chuyến đi." />;
  }

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Tìm chuyến đi
        </Text>

        <TextInput
          label="Điểm đón"
          placeholder="Nhập địa chỉ đón"
          value={pickupLocation}
          onChangeText={setPickupLocation}
          icon={<MapPin size={20} color={colors.primary} />}
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Điểm đến"
          placeholder="Nhập địa chỉ đến"
          value={dropoffLocation}
          onChangeText={setDropoffLocation}
          icon={<MapPin size={20} color={colors.error} />}
          style={{ marginBottom: spacing.md }}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TextInput
            label="Ngày"
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            icon={<Calendar size={18} color={colors.textSecondary} />}
            style={{ flex: 1, marginBottom: spacing.md }}
          />
          <TextInput
            label="Giờ"
            placeholder="HH:mm"
            value={time}
            onChangeText={setTime}
            icon={<Clock size={18} color={colors.textSecondary} />}
            style={{ flex: 1, marginBottom: spacing.md }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {quickTimes.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setTime(item)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.full,
                backgroundColor: time === item ? colors.primary : colors.surfaceAlt,
              }}
            >
              <Text style={{ color: time === item ? 'white' : colors.text, fontWeight: '600' }}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TextInput
            label="Số người"
            placeholder="2"
            value={passengers}
            onChangeText={setPassengers}
            keyboardType="numeric"
            icon={<Users size={18} color={colors.textSecondary} />}
            style={{ flex: 1, marginBottom: spacing.md }}
          />
          <TextInput
            label="Giá tối đa/km"
            placeholder="20000"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="numeric"
            style={{ flex: 1, marginBottom: spacing.md }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => setOnlyAvailable((value) => !value)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.full,
              backgroundColor: onlyAvailable ? colors.primary : colors.surfaceAlt,
            }}
          >
            <Text style={{ color: onlyAvailable ? 'white' : colors.text, fontWeight: '600' }}>
              Xe trống đúng giờ
            </Text>
          </TouchableOpacity>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSortMode(option.value)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.full,
                backgroundColor: sortMode === option.value ? colors.primary : colors.surfaceAlt,
              }}
            >
              <Text style={{ color: sortMode === option.value ? 'white' : colors.text, fontWeight: '600' }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label="Tìm xe phù hợp"
          onPress={handleSearch}
          icon={<Search size={20} color="white" />}
        />
      </Card>

      {searched && (
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
            Xe phù hợp
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}>
            {vehicles.length} xe khớp ngày {date}, giờ {time}, {passengerCount} hành khách
          </Text>

          {vehicles.map((vehicle) => {
            const selected = selectedVehicleId === vehicle.id;
            const available = vehicleAvailability(vehicle);

            return (
              <TouchableOpacity
                key={vehicle.id}
                onPress={() => {
                  setSelectedVehicleId(vehicle.id);
                  router.push({
                    pathname: '/(customer)/booking-detail' as any,
                    params: {
                      vehicleId: vehicle.id,
                      pickupLocation,
                      dropoffLocation,
                      date,
                      time,
                      passengers: String(passengerCount),
                    },
                  });
                }}
                activeOpacity={0.82}
                style={{
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.surface,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  marginBottom: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Car size={24} color={selected ? 'white' : colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                      {vehicle.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                      {vehicle.licensePlate} - {vehicle.color} - {vehicle.seats} chỗ
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>
                      {vehicle.pricePerKm.toLocaleString('vi-VN')} VND/km
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: available ? colors.success : colors.warning,
                      fontSize: fontSize.xs,
                      fontWeight: '700',
                    }}
                  >
                    {available ? 'Trống' : 'Bận'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {vehicles.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.xl }}>
              Không có xe phù hợp. Hãy đổi ngày, giờ, giá hoặc số người.
            </Text>
          )}

          <Button
            label="Gửi yêu cầu đặt xe"
            onPress={handleCreateBooking}
            disabled={!selectedVehicle}
          />
        </View>
      )}
    </Screen>
  );
}
