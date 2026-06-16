import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarClock, Car, LocateFixed, MapPin, Phone, ShieldCheck, Star } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Badge, Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { useBooking } from '@/hooks/useBooking';
import { PromoBanner } from '@/components/PromoBanner';
import { QuickActionRow } from '@/components/QuickActionRow';
import { NearbyMapCard } from '@/components/NearbyMapCard';
import { RecommendedVehicleCarousel } from '@/components/RecommendedVehicleCarousel';
import { RecentTripsCarousel } from '@/components/RecentTripsCarousel';
import { NewsUpdatesList } from '@/components/NewsUpdatesList';

import { HelpSupportRow } from '@/components/HelpSupportRow';
import { useVehicles } from '@/hooks/useVehicles';
import { apiClient } from '@/services/api';
import { DeviceLocation, getCurrentDeviceLocation } from '@/services/deviceLocation';

import { BlogPost, Vehicle } from '@/types';
import { DAIGO_LOGO_URL } from '@/constants/branding';

function DriverVehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const { colors } = useTheme();
  const callDriver = () => {
    if (vehicle.driverPhone) {
      Linking.openURL(`tel:${vehicle.driverPhone}`);
    }
  };

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      {!!vehicle.image && (
        <Image
          source={{ uri: vehicle.image }}
          style={{ width: '100%', height: 176, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md }}
        />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{vehicle.name}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            {vehicle.licensePlate} - {vehicle.color} - {vehicle.seats} chỗ
          </Text>
        </View>
        <Badge label={vehicle.status} variant={vehicle.status === 'Sẵn sàng' ? 'success' : 'warning'} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md }}>
        <Image
          source={{ uri: vehicle.driverAvatar }}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900' }}>{vehicle.driverName ?? 'Tài xế'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
            <Star size={14} color={colors.warning} fill={colors.warning} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Tài xế đã xác thực</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>
          {vehicle.pricePerKm.toLocaleString('vi-VN')}đ/km
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Thanh toán sau chuyến đi</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Đặt xe"
          onPress={() => router.push('/(customer)/booking')}
          style={{ flex: 1 }}
          icon={<Car size={18} color="white" />}
        />
        <Button
          label="Gọi ngay"
          onPress={callDriver}
          disabled={!vehicle.driverPhone}
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Phone size={18} color={colors.text} />}
        />
      </View>
    </Card>
  );
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { vehicles, fetchVehicles, isLoading } = useVehicles();
  const { bookings, fetchBookings } = useBooking();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);

  useEffect(() => {
    fetchVehicles();
    if (user?.id) {
      fetchBookings({ customerId: user.id });
    }
    apiClient.getBlogPosts(1, 6).then(setBlogPosts).catch(() => setBlogPosts([]));
    getCurrentDeviceLocation().then(setCurrentLocation).catch(() => undefined);
  }, [user?.id]);

  const refreshHome = async () => {
    setRefreshing(true);
    try {
      await fetchVehicles();
      if (user?.id) await fetchBookings({ customerId: user.id });
      const posts = await apiClient.getBlogPosts(1, 6);
      setBlogPosts(posts);
      const location = await getCurrentDeviceLocation().catch(() => null);
      if (location) setCurrentLocation(location);
    } finally {
      setRefreshing(false);
    }
  };

const isLoggedIn = !!user?.id;

const promotions = useMemo(() => {
  const postPromotions = blogPosts.slice(0, 3).map((post) => ({
    id: post.id,
    image: post.mediaUrls[0]?.startsWith('http') ? { uri: post.mediaUrls[0] } : undefined,
    title: post.caption || 'Cập nhật mới từ tài xế',
    description: `${post.driverName} - ${new Date(post.createdAt).toLocaleDateString('vi-VN')}`,
    cta: 'Xem bài viết',
    onPress: () =>
      router.push({
        pathname: '/(customer)/blog-detail' as any,
        params: { id: post.id },
      }),
  }));

  if (postPromotions.length > 0) return postPromotions;

  return vehicles.slice(0, 3).map((vehicle) => ({
    id: vehicle.id,
    image: vehicle.image?.startsWith('http') ? { uri: vehicle.image } : undefined,
    title: vehicle.name,
    description: `${vehicle.pricePerKm.toLocaleString('vi-VN')}đ/km - ${vehicle.seats} chỗ`,
    cta: 'Đặt xe',
    onPress: () => router.push('/(customer)/booking'),
  }));
}, [blogPosts, vehicles]);

  const quickActions = [
  { label: 'Đặt xe', icon: 'Car', route: '/(customer)/booking' },
  ...(isLoggedIn ? [{ label: 'Lịch sử', icon: 'CalendarClock', route: '/(customer)/profile' } as const] : []),
  { label: 'Tin mới', icon: 'Star', route: '/(customer)/blog' },
  { label: 'Thông báo', icon: 'ShieldCheck', route: '/(customer)/notifications' },
] as const;
const availableVehicles = vehicles.filter((vehicle) => vehicle.status === 'Sẵn sàng');
const recommendedVehicles = availableVehicles.length > 0 ? availableVehicles : vehicles;
const recentTrips = isLoggedIn ? bookings.slice(0, 6) : [];

  return (
    <Screen scroll padding refreshing={refreshing || isLoading} onRefresh={refreshHome}>
      {/* ─── GREETING + LOGO SECTION (Grab pattern) ─── */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Xin chào 👋</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginTop: spacing.xs }}>
              {user?.fullName || 'Khách hàng'}
            </Text>
          </View>
          {/* Daigo logo badge — right aligned */}
          <Image
            source={{ uri: DAIGO_LOGO_URL }}
            style={{
              width: 90,
              height: 40,
              resizeMode: 'contain',
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
          <LocateFixed size={15} color={colors.primary} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontSize: fontSize.sm }}>
            {currentLocation?.label ?? 'Đang chờ quyền GPS để gợi ý điểm đón'}
          </Text>
        </View>
      </View>

      <Card style={{ marginBottom: spacing.xl, backgroundColor: colors.primary, borderRadius: borderRadius.xl }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md }}>
          <View style={{ width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>Đặt xe với tài xế thật</Text>
            <Text style={{ color: 'rgba(255,255,255,0.86)', marginTop: spacing.xs, lineHeight: 20 }}>
              Chọn xe đang sẵn sàng và gọi trực tiếp tài xế khi cần.
            </Text>
          </View>
        </View>
        <Button
          label="Tạo chuyến mới"
          onPress={() => router.push('/(customer)/booking')}
          variant="secondary"
          icon={<MapPin size={18} color={colors.text} />}
        />
      </Card>

      <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: spacing.md }}>
        Xe và tài xế khả dụng
      </Text>

      {isLoading ? (
        <>
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
          <CardSkeleton image style={{ marginBottom: spacing.lg }} />
        </>
      ) : (
        availableVehicles.map((vehicle) => (
          <DriverVehicleCard key={vehicle.id} vehicle={vehicle} />
        ))
      )}

      {!isLoading && availableVehicles.length === 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.xs }}>Chưa có xe sẵn sàng</Text>
          <Text style={{ color: colors.textSecondary }}>Khi tài xế thêm xe hoặc bật trạng thái sẵn sàng, xe sẽ hiển thị tại đây.</Text>
        </Card>
      )}

      <View style={{ marginBottom: spacing.xl }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: spacing.md }}>
          Hành động nhanh
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(customer)/booking')}
          style={{
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
            <MapPin size={24} color="white" />
          </View>
          <View>
            <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}>Đặt chuyến đi</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Chọn điểm đón, điểm đến và xe</Text>
          </View>
        </TouchableOpacity>

        {isLoggedIn && (
          <TouchableOpacity
            onPress={() => router.push('/(customer)/profile')}
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.info, justifyContent: 'center', alignItems: 'center' }}>
              <CalendarClock size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontWeight: '800', color: colors.text, marginBottom: 4 }}>Lịch sử chuyến đi</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Xem lại các chuyến đã đặt</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {/* New premium sections */}
      {promotions.length > 0 && <PromoBanner promotions={promotions} />}
      <QuickActionRow actions={quickActions} />
      <NearbyMapCard vehicles={recommendedVehicles} currentLocation={currentLocation} onPress={() => router.push('/(customer)/booking')} />
      <RecommendedVehicleCarousel vehicles={recommendedVehicles} onVehiclePress={() => router.push('/(customer)/booking')} />
      {isLoggedIn && (
        <RecentTripsCarousel
          trips={recentTrips}
          onTripPress={(booking) =>
            router.push({ pathname: '/(customer)/booking-detail' as any, params: { id: booking.id } })
          }
        />
      )}
      <NewsUpdatesList
        posts={blogPosts}
        onPostPress={(post) =>
          router.push({
            pathname: '/(customer)/blog-detail' as any,
            params: { id: post.id },
          })
        }
      />

      <HelpSupportRow />
    </Screen>
  );
}
