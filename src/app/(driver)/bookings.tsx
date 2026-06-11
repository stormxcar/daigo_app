import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Briefcase } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { BookingCard } from '@/components/FeatureCards';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Booking } from '@/types';

export default function DriverBookings() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  const visibleBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === 'Chờ xác nhận' ||
          booking.driverId === user?.id
      ),
    [bookings, user?.id]
  );

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBookings();
      setBookings(data);
    } catch (error: any) {
      Alert.alert('Không thể tải chuyến đi', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const channelName = `driver-bookings-${user?.id ?? 'guest'}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleAccept = async (bookingId: string) => {
    if (!user) return;

    try {
      setLoadingId(bookingId);
      await apiClient.acceptBooking(bookingId, user.id);
      await fetchBookings();
    } catch (error: any) {
      Alert.alert('Không thể xác nhận chuyến', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      setLoadingId(bookingId);
      await apiClient.cancelBooking(bookingId);
      await fetchBookings();
    } catch (error: any) {
      Alert.alert('Không thể hủy chuyến', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Screen scroll padding refreshing={loading} onRefresh={fetchBookings}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.md }}>
        Chuyến đi
      </Text>

      {loading ? (
        <>
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
        </>
      ) : visibleBookings.slice(0, visibleCount).map((booking) => (
        <Card key={booking.id} style={{ marginBottom: spacing.lg }}>
          <BookingCard
            {...booking}
            onPress={() =>
              router.push({
                pathname: '/(driver)/booking-detail' as any,
                params: { id: booking.id },
              })
            }
          />
          {!!booking.note && (
            <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.xs }}>
                Ghi chú khách hàng
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{booking.note}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            {booking.status === 'Chờ xác nhận' && (
              <Button
                label="Xác nhận"
                onPress={() => handleAccept(booking.id)}
                loading={loadingId === booking.id}
                size="sm"
                style={{ flex: 1 }}
              />
            )}
            {booking.status !== 'Đã hủy' && booking.status !== 'Hoàn thành' && (
              <Button
                label="Hủy"
                onPress={() => handleCancel(booking.id)}
                loading={loadingId === booking.id}
                variant="danger"
                size="sm"
                style={{ flex: 1 }}
              />
            )}
          </View>
        </Card>
      ))}

      {!loading && visibleBookings.length === 0 && (
        <EmptyState
          icon={<Briefcase size={48} color={colors.primary} />}
          title="Chưa có chuyến đi"
          description="Các booking chờ xác nhận sẽ hiển thị ở đây"
        />
      )}
      {!loading && visibleBookings.length > visibleCount && (
        <Button
          label="Tải thêm chuyến đi"
          onPress={() => setVisibleCount((current) => current + 8)}
          variant="outline"
        />
      )}
    </Screen>
  );
}
