import React, { useEffect } from 'react';
import { Alert, Linking, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, fontSize, borderRadius } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Card, Button, Badge } from '@/components/BaseComponents';
import { VehicleCard, DriverCard } from '@/components/FeatureCards';
import { useAuth } from '@/hooks/useAuth';
import { useVehicles } from '@/hooks/useVehicles';
import { useBooking } from '@/hooks/useBooking';
import { MapPin, Clock } from 'lucide-react-native';
import { MOCK_VEHICLES, MOCK_DRIVER } from '@/services/mockData';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { fetchVehicles } = useVehicles();
  const { fetchBookings } = useBooking();

  const handleCallDriver = async () => {
    const phoneUrl = `tel:${MOCK_DRIVER.phone}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (!supported) {
        Alert.alert('Không thể gọi', 'Thiết bị hiện không hỗ trợ mở ứng dụng gọi điện.');
        return;
      }
      await Linking.openURL(phoneUrl);
    } catch {
      Alert.alert('Không thể gọi', 'Vui lòng thử lại sau.');
    }
  };

  useEffect(() => {
    // Load initial data
    fetchVehicles();
    if (user?.id) {
      fetchBookings({ customerId: user.id });
    }
  }, [user?.id]);

  return (
    <Screen scroll>
      {/* Header with greeting and notification */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <View>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            Xin chào
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.text,
              marginTop: spacing.xs,
            }}
          >
            {user?.fullName || 'Khách hàng'}
          </Text>
        </View>
      </View>

      {/* Feature Highlight */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <Badge label="VinFast VF7 Plus Premium" variant="primary" size="sm" />
          <Text
            style={{
              color: 'white',
              fontSize: 20,
              fontWeight: '700',
              marginTop: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            Đặt xe cao cấp
          </Text>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Trải nghiệm dịch vụ vận chuyển sang trọng với công nghệ điện hàng đầu
          </Text>
        </View>

        <Button
          label="Đặt xe ngay"
          onPress={() => router.push('/(customer)/booking')}
        />
      </Card>

      {/* Vehicles Section */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Xe khả dụng
        </Text>
        {MOCK_VEHICLES.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            {...vehicle}
            onPress={() => router.push('/(customer)/booking')}
            style={{ marginBottom: spacing.md }}
          />
        ))}
      </View>

      {/* Driver Section */}
      <View style={{ marginBottom: spacing.lg }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Tài xế của bạn
        </Text>
        <DriverCard
          name={MOCK_DRIVER.name}
          rating={MOCK_DRIVER.rating}
          experience={MOCK_DRIVER.experienceYears}
          phone={MOCK_DRIVER.phone}
          avatarUri={MOCK_DRIVER.avatar}
          onCallPress={handleCallDriver}
          onChatPress={() => router.push('/(customer)/chat')}
        />
      </View>

      {/* Quick Actions */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Hành động nhanh
        </Text>
        <View style={{ gap: spacing.md }}>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/booking')}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MapPin size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                Đặt chuyến đi
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Bắt đầu chuyến đi mới
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(customer)/booking')}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.info,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Clock size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                Lịch sử chuyến đi
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Xem chuyến đi trước đó
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
