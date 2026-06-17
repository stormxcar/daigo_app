import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  Briefcase,
  Clock,
  DollarSign,
  LayoutGrid,
  LayoutList,
  MapPin,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { Button, Card, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { BookingCard } from '@/components/FeatureCards';
import {
  BookingListControls,
  BookingSortMode,
  BookingStatusFilter,
  filterAndSortBookings,
} from '@/components/BookingListControls';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Booking } from '@/types';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { showError, showSuccess } from '@/utils/toast';
import { getBookingStatusInfo } from '@/utils/helpers';

type LayoutMode = 'card' | 'list';
const BOOKING_PAGE_SIZE = 12;

// ─── Compact List Row ─────────────────────────────────────────────────────────
function BookingListRow({
  booking,
  onPress,
  onAccept,
  onCancel,
  loadingId,
}: {
  booking: Booking;
  onPress: () => void;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  loadingId: string | null;
}) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const isLoading = loadingId === booking.id;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        {
          backgroundColor: colors.surface,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          ...shadows.sm,
        },
      ]}
    >
      {/* Status dot */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: statusInfo.color + '22',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: statusInfo.color,
          }}
        />
      </View>

      {/* Main info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.sm }} numberOfLines={1}>
            {booking.bookingCode ?? 'Chuyến đi'}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: borderRadius.full,
              backgroundColor: statusInfo.color,
              marginLeft: spacing.xs,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <MapPin size={11} color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1 }} numberOfLines={1}>
            {booking.pickupLocation}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={11} color={colors.error} />
          <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1 }} numberOfLines={1}>
            {booking.dropoffLocation}
          </Text>
        </View>

        {/* Meta row */}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Clock size={10} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{booking.time}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Users size={10} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{booking.passengers}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <DollarSign size={10} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
              {booking.estimatedPrice.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ gap: spacing.xs, flexShrink: 0 }}>
        {booking.status === BOOKING_STATUS.SEARCHING_DRIVER && (
          <TouchableOpacity
            onPress={() => onAccept(booking.id)}
            disabled={isLoading}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>Nhận</Text>
          </TouchableOpacity>
        )}
        {!TERMINAL_BOOKING_STATUSES.includes(booking.status as any) && (
          <TouchableOpacity
            onPress={() => onCancel(booking.id)}
            disabled={isLoading}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.md,
              backgroundColor: colors.error + '20',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.error, fontSize: 10, fontWeight: '800' }}>Hủy</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Layout Toggle Button ─────────────────────────────────────────────────────
function LayoutToggle({ mode, onChange }: { mode: LayoutMode; onChange: (m: LayoutMode) => void }) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(mode === 'card' ? 0 : 1)).current;

  const toggle = (next: LayoutMode) => {
    Animated.spring(slideAnim, {
      toValue: next === 'card' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
    onChange(next);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 34],
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: borderRadius.full,
        padding: 2,
        width: 72,
        height: 34,
        position: 'relative',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 2,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primary,
          transform: [{ translateX }],
          ...shadows.sm,
        }}
      />
      <TouchableOpacity
        onPress={() => toggle('card')}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      >
        <LayoutGrid size={15} color={mode === 'card' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => toggle('list')}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      >
        <LayoutList size={15} color={mode === 'list' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DriverBookings() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('all');
  const [sortMode, setSortMode] = useState<BookingSortMode>('newest');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('card');
  const offerSheetRef = useRef<BottomSheetModal>(null);

  const availableBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === BOOKING_STATUS.SEARCHING_DRIVER ||
          booking.driverId === user?.id
      ),
    [bookings, user?.id]
  );
  const visibleBookings = useMemo(
    () => filterAndSortBookings(availableBookings, searchQuery, statusFilter, sortMode),
    [availableBookings, searchQuery, statusFilter, sortMode]
  );
  const pendingOffer = availableBookings.find(
    (booking) => booking.status === BOOKING_STATUS.SEARCHING_DRIVER && booking.id !== dismissedOfferId
  );
  const activeFilterCount = [
    searchQuery,
    statusFilter !== 'all' ? statusFilter : '',
    sortMode !== 'newest' ? sortMode : '',
  ].filter(Boolean).length;

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBookings({ page: 1, pageSize: BOOKING_PAGE_SIZE });
      setBookings(data);
      setPage(1);
      setHasMore(data.length === BOOKING_PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải chuyến đi', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreBookings = async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await apiClient.getBookings({ page: nextPage, pageSize: BOOKING_PAGE_SIZE });
      setBookings((current) => {
        const existingIds = new Set(current.map((booking) => booking.id));
        return [...current, ...data.filter((booking) => !existingIds.has(booking.id))];
      });
      setPage(nextPage);
      setHasMore(data.length === BOOKING_PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải thêm chuyến đi', error.message);
    } finally {
      setLoadingMore(false);
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

  useEffect(() => {
    if (pendingOffer) {
      offerSheetRef.current?.present();
    } else {
      offerSheetRef.current?.dismiss();
    }
  }, [pendingOffer?.id]);

  const handleAccept = async (bookingId: string) => {
    if (!user) return;
    try {
      setLoadingId(bookingId);
      await apiClient.acceptBooking(bookingId, user.id);
      offerSheetRef.current?.dismiss();
      await fetchBookings();
      showSuccess('Đã nhận chuyến', 'Booking đã được cập nhật cho tài xế.');
    } catch (error: any) {
      showError('Không thể xác nhận chuyến', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      setLoadingId(bookingId);
      await apiClient.cancelBookingByDriver(bookingId, 'Tài xế hủy từ danh sách chuyến đi');
      await fetchBookings();
    } catch (error: any) {
      showError('Không thể hủy chuyến', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const goToDetail = (id: string) =>
    router.push({ pathname: '/(driver)/booking-detail' as any, params: { id } });

  return (
    <Screen scroll refreshing={loading} onRefresh={fetchBookings}>
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
            Chuyến đi
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
            {visibleBookings.length} chuyến {activeFilterCount > 0 ? '(đã lọc)' : ''}
          </Text>
        </View>
        <LayoutToggle mode={layoutMode} onChange={setLayoutMode} />
      </View>

      {/* ── Filters ── */}
      <View style={{ paddingHorizontal: spacing.lg }}>
        <BookingListControls
          query={searchQuery}
          onQueryChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          expanded={filtersExpanded}
          onExpandedChange={setFiltersExpanded}
          activeCount={activeFilterCount}
          onReset={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setSortMode('newest');
          }}
        />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
        </View>
      ) : layoutMode === 'card' ? (
        /* ══ CARD VIEW ══ */
        <View style={{ paddingHorizontal: spacing.lg }}>
          {visibleBookings.map((booking) => (
            <Card key={booking.id} style={{ marginBottom: spacing.lg }}>
              <BookingCard
                {...booking}
                onPress={() => goToDetail(booking.id)}
              />
              {!!booking.note && (
                <View
                  style={{
                    marginTop: spacing.sm,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.xs }}>
                    Ghi chú khách hàng
                  </Text>
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{booking.note}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                {booking.status === BOOKING_STATUS.SEARCHING_DRIVER && (
                  <Button
                    label="Xác nhận"
                    onPress={() => handleAccept(booking.id)}
                    loading={loadingId === booking.id}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                )}
                {!TERMINAL_BOOKING_STATUSES.includes(booking.status as any) && (
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
        </View>
      ) : (
        /* ══ LIST VIEW ══ */
        <View>
          {visibleBookings.map((booking) => (
            <BookingListRow
              key={booking.id}
              booking={booking}
              onPress={() => goToDetail(booking.id)}
              onAccept={handleAccept}
              onCancel={handleCancel}
              loadingId={loadingId}
            />
          ))}
        </View>
      )}

      {/* ── Empty ── */}
      {!loading && visibleBookings.length === 0 && (
        <EmptyState
          icon={<Briefcase size={48} color={colors.primary} />}
          title="Không tìm thấy chuyến đi"
          description="Thử đổi từ khóa, trạng thái hoặc cách sắp xếp"
        />
      )}

      {/* ── Load more ── */}
      {!loading && hasMore && activeFilterCount === 0 && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <Button
            label={loadingMore ? 'Đang tải thêm...' : 'Tải thêm chuyến đi'}
            onPress={loadMoreBookings}
            variant="outline"
            loading={loadingMore}
            disabled={loadingMore}
          />
        </View>
      )}

      {/* ── New booking offer bottom sheet ── */}
      <BottomSheetModal
        ref={offerSheetRef}
        snapPoints={['46%']}
        enablePanDownToClose
        onDismiss={() => pendingOffer && setDismissedOfferId(pendingOffer.id)}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        {pendingOffer && (
          <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>
              🚗 Bạn có chuyến mới
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {pendingOffer.bookingCode ?? 'Booking'} - {pendingOffer.passengers} khách
            </Text>
            <View
              style={{
                padding: spacing.md,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceAlt,
                gap: spacing.sm,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>Điểm đón</Text>
              <Text style={{ color: colors.textSecondary }}>{pendingOffer.pickupLocation}</Text>
              <Text style={{ color: colors.text, fontWeight: '800', marginTop: spacing.sm }}>
                Điểm đến
              </Text>
              <Text style={{ color: colors.textSecondary }}>{pendingOffer.dropoffLocation}</Text>
              {!!pendingOffer.note && (
                <>
                  <Text style={{ color: colors.text, fontWeight: '800', marginTop: spacing.sm }}>
                    Ghi chú
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>{pendingOffer.note}</Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Nhận chuyến"
                onPress={() => handleAccept(pendingOffer.id)}
                loading={loadingId === pendingOffer.id}
                style={{ flex: 1 }}
              />
              <Button
                label="Bỏ qua"
                onPress={() => {
                  setDismissedOfferId(pendingOffer.id);
                  offerSheetRef.current?.dismiss();
                }}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          </BottomSheetView>
        )}
      </BottomSheetModal>
    </Screen>
  );
}
