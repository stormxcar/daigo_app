import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CalendarClock, CreditCard, MapPin, Navigation, Receipt, RotateCcw } from 'lucide-react-native';
import { Badge, Button } from '@/components/BaseComponents';
import {
  BookingListControls,
  BookingSortMode,
  BookingStatusFilter,
  filterAndSortBookings,
} from '@/components/BookingListControls';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Booking, BookingPaymentStatus } from '@/types';
import { formatCurrency, formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { showError } from '@/utils/toast';

type DateFilter = 'all' | '7d' | '30d' | 'scheduled_future';
type PaymentFilter = 'all' | BookingPaymentStatus;
type ModeFilter = 'all' | 'instant' | 'scheduled';
type LayoutMode = 'card' | 'list';

const PAGE_SIZE = 30;

const dateFilters: { label: string; value: DateFilter }[] = [
  { label: 'Tất cả ngày', value: 'all' },
  { label: '7 ngày', value: '7d' },
  { label: '30 ngày', value: '30d' },
  { label: 'Sắp tới', value: 'scheduled_future' },
];

const paymentFilters: { label: string; value: PaymentFilter }[] = [
  { label: 'Tất cả thanh toán', value: 'all' },
  { label: 'Chưa thanh toán', value: 'unpaid' },
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đã báo CK', value: 'submitted' },
  { label: 'Đã thanh toán', value: 'paid' },
  { label: 'Bị từ chối', value: 'rejected' },
  { label: 'Hết hạn', value: 'expired' },
];

const modeFilters: { label: string; value: ModeFilter }[] = [
  { label: 'Tất cả loại chuyến', value: 'all' },
  { label: 'Đặt ngay', value: 'instant' },
  { label: 'Đặt trước', value: 'scheduled' },
];

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: colors.text, ...fontForWeight('900'), marginBottom: spacing.sm }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.full,
              backgroundColor: value === option.value ? colors.primary : colors.surfaceAlt,
            }}
          >
            <Text style={{ color: value === option.value ? 'white' : colors.text, fontSize: fontSize.sm, ...fontForWeight('800')}}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HistoryItem({ booking, mode, onPress }: { booking: Booking; mode: LayoutMode; onPress: () => void }) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const amount = booking.actualPrice ?? booking.estimatedPrice ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: mode === 'card' ? 1 : 0,
        borderBottomWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: statusInfo.color + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CalendarClock size={21} color={statusInfo.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSize.base, ...fontForWeight('900')}}>
              {booking.bookingCode ?? 'Chuyến đi'}
            </Text>
            <Badge label={statusInfo.label} variant={booking.status === BOOKING_STATUS.TRIP_COMPLETED ? 'success' : TERMINAL_BOOKING_STATUSES.includes(booking.status as any) ? 'error' : 'info'} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('800'), marginBottom: spacing.sm }}>
            {booking.time} - {formatVietnamDate(booking.date)} · {booking.bookingMode === 'scheduled' ? 'Đặt trước' : 'Đặt ngay'}
          </Text>
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MapPin size={14} color={colors.primary} />
              <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontSize: fontSize.sm }}>{booking.pickupLocation}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Navigation size={14} color={colors.error} />
              <Text numberOfLines={1} style={{ flex: 1, color: colors.textSecondary, fontSize: fontSize.sm }}>{booking.dropoffLocation}</Text>
            </View>
          </View>
          {mode === 'card' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CreditCard size={13} color={colors.info} />
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{booking.paymentStatus ?? 'unpaid'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Receipt size={13} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: fontSize.xs, ...fontForWeight('900')}}>{formatCurrency(amount)}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomerHistoryScreen() {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('all');
  const [sortMode, setSortMode] = useState<BookingSortMode>('newest');
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('card');

  const loadBookings = useCallback(async (nextPage = 1) => {
    if (!user?.id) return;
    try {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true);
      const data = await apiClient.getBookings({ customerId: user.id, page: nextPage, pageSize: PAGE_SIZE });
      setBookings((current) => {
        if (nextPage === 1) return data;
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...data.filter((item) => !ids.has(item.id))];
      });
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải lịch sử', error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBookings(1);
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const now = Date.now();
    return filterAndSortBookings(bookings, query, statusFilter, sortMode)
      .filter((booking) => {
        if (modeFilter !== 'all' && (booking.bookingMode ?? 'instant') !== modeFilter) return false;
        if (paymentFilter !== 'all' && (booking.paymentStatus ?? 'unpaid') !== paymentFilter) return false;
        if (dateFilter === 'all') return true;
        const bookingTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
        if (!Number.isFinite(bookingTime)) return true;
        if (dateFilter === '7d') return bookingTime >= now - 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === '30d') return bookingTime >= now - 30 * 24 * 60 * 60 * 1000;
        if (dateFilter === 'scheduled_future') return booking.bookingMode === 'scheduled' && bookingTime >= now;
        return true;
      });
  }, [bookings, dateFilter, modeFilter, paymentFilter, query, sortMode, statusFilter]);

  const activeCount = [
    query,
    statusFilter !== 'all' ? statusFilter : '',
    sortMode !== 'newest' ? sortMode : '',
    dateFilter !== 'all' ? dateFilter : '',
    paymentFilter !== 'all' ? paymentFilter : '',
    modeFilter !== 'all' ? modeFilter : '',
  ].filter(Boolean).length;

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để xem lịch sử chuyến đi." />;
  }

  return (
    <Screen>
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => loadBookings(1)}
        contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
        ListHeaderComponent={
          <View>
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {filteredBookings.length} chuyến · lọc theo trạng thái, thời gian, thanh toán và loại chuyến.
              </Text>
            </View>
            <View style={{ padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={{ color: colors.textSecondary, ...fontForWeight('800')}}>{activeCount > 0 ? `${activeCount} bộ lọc đang bật` : 'Chưa bật bộ lọc'}</Text>
                <TouchableOpacity onPress={() => setLayoutMode((value) => value === 'card' ? 'list' : 'card')}>
                  <Text style={{ color: colors.primary, ...fontForWeight('900')}}>{layoutMode === 'card' ? 'Dạng list' : 'Dạng card'}</Text>
                </TouchableOpacity>
              </View>
              <BookingListControls
                query={query}
                onQueryChange={setQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                expanded={controlsExpanded}
                onExpandedChange={setControlsExpanded}
                activeCount={activeCount}
                onReset={() => {
                  setQuery('');
                  setStatusFilter('all');
                  setSortMode('newest');
                  setDateFilter('all');
                  setPaymentFilter('all');
                  setModeFilter('all');
                }}
              />
              <FilterChips label="Thời gian" options={dateFilters} value={dateFilter} onChange={setDateFilter} />
              <FilterChips label="Thanh toán" options={paymentFilters} value={paymentFilter} onChange={setPaymentFilter} />
              <FilterChips label="Loại chuyến" options={modeFilters} value={modeFilter} onChange={setModeFilter} />
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={<RotateCcw size={46} color={colors.primary} />}
              title="Chưa có chuyến phù hợp"
              description="Thử đổi bộ lọc hoặc đặt chuyến mới để lịch sử hiển thị tại đây."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const isReadOnly = TERMINAL_BOOKING_STATUSES.includes(item.status as any) || item.status === BOOKING_STATUS.TRIP_COMPLETED;
          return (
            <HistoryItem
              booking={item}
              mode={layoutMode}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/booking-detail' as any,
                  params: { id: item.id, readOnly: isReadOnly ? 'true' : 'false' },
                })
              }
            />
          );
        }}
        ListFooterComponent={
          hasMore ? (
            <View style={{ padding: spacing.lg }}>
              <Button
                label={loadingMore ? 'Đang tải thêm...' : 'Tải thêm chuyến'}
                onPress={() => loadBookings(page + 1)}
                loading={loadingMore}
                disabled={loadingMore}
                variant="outline"
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
