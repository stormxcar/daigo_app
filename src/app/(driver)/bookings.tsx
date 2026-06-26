import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  LayoutGrid,
  LayoutList,
  MapPin,
  MoreVertical,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { Button, CardSkeleton } from '@/components/BaseComponents';
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
import { Booking, BookingDispatch } from '@/types';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { showError, showSuccess } from '@/utils/toast';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { PaymentStatusBadge, getPaymentMethodLabel } from '@/components/PaymentStatusBadge';

type LayoutMode = 'card' | 'list';
const BOOKING_PAGE_SIZE = 12;
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) => `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;

const buildMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingEmpty = (firstDay + 6) % 7;
  const cells: Array<{ date: string; day: number; inMonth: boolean } | null> = [];

  for (let index = 0; index < leadingEmpty; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date: toLocalIsoDate(date), day, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// ─── Compact List Row ─────────────────────────────────────────────────────────
function BookingListRow({
  booking,
  onPress,
  onAccept,
  onCancel,
  canCancel,
  loadingId,
}: {
  booking: Booking;
  onPress: () => void;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  canCancel: boolean;
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
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
          <PaymentStatusBadge status={booking.paymentStatus} />
          <Text style={{ color: colors.textTertiary, fontSize: 10, fontWeight: '700' }}>
            {getPaymentMethodLabel(booking.paymentMethod)}
          </Text>
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
            
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
              {booking.estimatedPrice.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ gap: spacing.xs, flexShrink: 0 }}>
        {(booking.status === BOOKING_STATUS.SEARCHING_DRIVER || booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER) && (
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
        {canCancel && (
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
  const [scheduledCalendarBookings, setScheduledCalendarBookings] = useState<Booking[]>([]);
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
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleMonth, setScheduleMonth] = useState(() => new Date());
  const [scheduleCalendarExpanded, setScheduleCalendarExpanded] = useState(false);
  const offerSheetRef = useRef<BottomSheetModal>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dispatchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [pendingDispatches, setPendingDispatches] = useState<BookingDispatch[]>([]);
  const [dispatchCountdown, setDispatchCountdown] = useState(0);

  const availableBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === BOOKING_STATUS.SEARCHING_DRIVER ||
          booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER ||
          booking.driverId === user?.id
      ),
    [bookings, user?.id]
  );
  const visibleBookings = useMemo(
    () => filterAndSortBookings(availableBookings, searchQuery, statusFilter, sortMode),
    [availableBookings, searchQuery, statusFilter, sortMode]
  );
  const canDriverCancelBooking = useCallback(
    (booking: Booking) =>
      booking.driverId === user?.id &&
      [
        BOOKING_STATUS.DRIVER_ACCEPTED,
        BOOKING_STATUS.DRIVER_ARRIVING,
        BOOKING_STATUS.DRIVER_ARRIVED,
        BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED,
        BOOKING_STATUS.SCHEDULED_UPCOMING,
      ].includes(booking.status as any),
    [user?.id]
  );
  const scheduledBookings = useMemo(
    () =>
      scheduledCalendarBookings
        .filter((booking) => booking.bookingMode === 'scheduled')
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    [scheduledCalendarBookings]
  );
  const scheduleDayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scheduledBookings.forEach((booking) => {
      counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1);
    });
    return counts;
  }, [scheduledBookings]);
  const monthCells = useMemo(() => buildMonthGrid(scheduleMonth), [scheduleMonth]);
  const selectedScheduledBookings = useMemo(
    () => scheduledBookings.filter((booking) => booking.date === selectedScheduleDate),
    [scheduledBookings, selectedScheduleDate]
  );
  const pendingDispatch = useMemo(
    () => pendingDispatches.find((dispatch) => dispatch.id !== dismissedOfferId),
    [dismissedOfferId, pendingDispatches]
  );
  const pendingOffer = pendingDispatch?.booking;
  const activeFilterCount = [
    searchQuery,
    statusFilter !== 'all' ? statusFilter : '',
    sortMode !== 'newest' ? sortMode : '',
  ].filter(Boolean).length;
  const paymentSummary = useMemo(() => {
    const driverBookings = visibleBookings.filter((booking) => booking.driverId === user?.id);
    const cash = driverBookings.filter((booking) => booking.paymentMethod === 'cash');
    const transfer = driverBookings.filter((booking) => booking.paymentMethod === 'bank_transfer' || booking.paymentMethod === 'vietqr');
    const pendingReview = driverBookings.filter((booking) => ['pending', 'submitted'].includes(booking.paymentStatus ?? 'unpaid'));
    const paid = driverBookings.filter((booking) => ['paid', 'driver_verified'].includes(booking.paymentStatus ?? 'unpaid'));
    return {
      cash: cash.length,
      transfer: transfer.length,
      pendingReview: pendingReview.length,
      paid: paid.length,
    };
  }, [user?.id, visibleBookings]);

  const fetchBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiClient.getBookings({
        driverVisibleTo: user.id,
        page: 1,
        pageSize: BOOKING_PAGE_SIZE,
      });
      setBookings(data);
      setPage(1);
      setHasMore(data.length === BOOKING_PAGE_SIZE);
    } catch (error: any) {
      showError('Không thể tải chuyến đi', error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchScheduledCalendar = useCallback(async () => {
    if (!user?.id) {
      setScheduledCalendarBookings([]);
      return;
    }

    try {
      const data = await apiClient.getDriverScheduledBookingsByMonth(user.id, scheduleMonth);
      setScheduledCalendarBookings(data);
    } catch (error: any) {
      showError('Không thể tải lịch đặt trước', error.message);
    }
  }, [scheduleMonth, user?.id]);

  const fetchPendingDispatches = useCallback(async () => {
    if (!user?.id) {
      setPendingDispatches([]);
      return;
    }

    try {
      const data = await apiClient.getPendingBookingDispatches(user.id);
      setPendingDispatches(data);
    } catch (error: any) {
      showError('Không thể tải chuyến được gửi đến bạn', error.message);
    }
  }, [user?.id]);

  const loadMoreBookings = async () => {
    if (!user?.id || loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await apiClient.getBookings({
        driverVisibleTo: user.id,
        page: nextPage,
        pageSize: BOOKING_PAGE_SIZE,
      });
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
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    if (!user?.id) {
      setBookings([]);
      setPendingDispatches([]);
      setLoading(false);
      return;
    }

    fetchBookings();
    fetchScheduledCalendar();
    fetchPendingDispatches();

    const channel = supabase
      .channel(`driver-bookings-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
        fetchScheduledCalendar();
      })
      .subscribe();
    realtimeChannelRef.current = channel;

    const dispatchChannel = supabase
      .channel(`driver-dispatches-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_dispatches', filter: `driver_id=eq.${user.id}` },
        () => {
          fetchPendingDispatches();
          fetchBookings();
          fetchScheduledCalendar();
        }
      )
      .subscribe();
    dispatchChannelRef.current = dispatchChannel;

    return () => {
      supabase.removeChannel(channel);
      if (realtimeChannelRef.current === channel) realtimeChannelRef.current = null;
      supabase.removeChannel(dispatchChannel);
      if (dispatchChannelRef.current === dispatchChannel) dispatchChannelRef.current = null;
    };
  }, [fetchBookings, fetchPendingDispatches, fetchScheduledCalendar, user?.id]);

  useEffect(() => {
    if (pendingOffer) {
      offerSheetRef.current?.present();
    } else {
      offerSheetRef.current?.dismiss();
    }
  }, [pendingOffer]);

  useEffect(() => {
    if (!pendingDispatch) {
      setDispatchCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((new Date(pendingDispatch.expiresAt).getTime() - Date.now()) / 1000));
      setDispatchCountdown(seconds);
      if (seconds <= 0) {
        apiClient
          .timeoutBookingDispatch(pendingDispatch.id)
          .then(fetchPendingDispatches)
          .catch(() => undefined);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [fetchPendingDispatches, pendingDispatch]);

  const handleAccept = async (bookingId: string) => {
    if (!user) return;
    try {
      setLoadingId(bookingId);
      const targetBooking = bookings.find((booking) => booking.id === bookingId);
      if (targetBooking?.bookingMode === 'scheduled' || targetBooking?.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER) {
        await apiClient.acceptScheduledBooking(bookingId);
      } else {
        await apiClient.acceptBooking(bookingId, user.id);
      }
      offerSheetRef.current?.dismiss();
      await fetchBookings();
      showSuccess('Đã nhận chuyến', 'Booking đã được cập nhật cho tài xế.');
    } catch (error: any) {
      showError('Không thể xác nhận chuyến', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAcceptDispatch = async (dispatch: BookingDispatch) => {
    if (!user) return;
    try {
      setLoadingId(dispatch.bookingId);
      await apiClient.acceptBookingDispatch(dispatch);
      offerSheetRef.current?.dismiss();
      setDismissedOfferId(null);
      await Promise.all([fetchBookings(), fetchPendingDispatches()]);
      showSuccess('Đã nhận chuyến', 'Chuyến đã được gán cho bạn.');
    } catch (error: any) {
      showError('Không thể nhận chuyến', error.message);
      await fetchPendingDispatches();
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectDispatch = async (dispatch: BookingDispatch) => {
    try {
      setLoadingId(dispatch.bookingId);
      await apiClient.rejectBookingDispatch(dispatch.id);
      offerSheetRef.current?.dismiss();
      setDismissedOfferId(dispatch.id);
      await Promise.all([fetchBookings(), fetchPendingDispatches()]);
      showSuccess('Đã từ chối chuyến', 'Hệ thống sẽ gửi chuyến này tới tài xế khác.');
    } catch (error: any) {
      showError('Không thể từ chối chuyến', error.message);
      await fetchPendingDispatches();
    } finally {
      setLoadingId(null);
    }
  };

  const openBookingActions = (booking: Booking) => {
    const actions: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[] = [
      { text: 'Xem chi tiết', onPress: () => goToDetail(booking.id) },
    ];

    if (booking.status === BOOKING_STATUS.SEARCHING_DRIVER || booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER) {
      actions.push({ text: 'Xác nhận chuyến', onPress: () => handleAccept(booking.id) });
    }

    if (canDriverCancelBooking(booking)) {
      actions.push({ text: 'Hủy chuyến', style: 'destructive', onPress: () => handleCancel(booking.id) });
    }

    actions.push({ text: 'Đóng', style: 'cancel' });
    Alert.alert('Tùy chọn chuyến đi', booking.bookingCode ?? undefined, actions);
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

      {/* ── Scheduled calendar ── */}
      <View style={{ marginBottom: spacing.md }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.md,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setScheduleCalendarExpanded((value) => !value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              marginBottom: scheduleCalendarExpanded ? spacing.md : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <CalendarDays size={20} color={colors.primary} />
              <View>
                <Text style={{ color: colors.text, fontWeight: '900' }}>Lịch đặt trước</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                  {scheduledBookings.length} chuyến đặt trước
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.primary, fontWeight: '900', fontSize: fontSize.sm }}>
                {scheduleCalendarExpanded ? getMonthLabel(scheduleMonth) : formatVietnamDate(selectedScheduleDate)}
              </Text>
              {scheduleCalendarExpanded ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          {scheduleCalendarExpanded ? (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setScheduleMonth((current) => {
                      const next = new Date(current.getFullYear(), current.getMonth() - 1, 1);
                      setSelectedScheduleDate(toLocalIsoDate(next));
                      return next;
                    });
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontWeight: '900' }}>{getMonthLabel(scheduleMonth)}</Text>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setScheduleMonth((current) => {
                      const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
                      setSelectedScheduleDate(toLocalIsoDate(next));
                      return next;
                    });
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row' }}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text
                    key={label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      color: colors.textSecondary,
                      fontSize: fontSize.xs,
                      fontWeight: '900',
                      paddingBottom: spacing.xs,
                    }}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {monthCells.map((cell, index) => {
                  if (!cell) {
                    return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
                  }

                  const selected = cell.date === selectedScheduleDate;
                  const today = cell.date === toLocalIsoDate(new Date());
                  const count = scheduleDayCounts.get(cell.date) ?? 0;
                  return (
                    <TouchableOpacity
                      key={cell.date}
                      activeOpacity={0.84}
                      onPress={() => setSelectedScheduleDate(cell.date)}
                      style={{
                        width: `${100 / 7}%`,
                        aspectRatio: 1,
                        padding: 3,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          borderRadius: borderRadius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? colors.primary : count > 0 ? colors.primary + '14' : colors.surfaceAlt,
                          borderWidth: today || count > 0 ? 1 : 0,
                          borderColor: selected ? colors.primary : today ? colors.primary : colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? 'white' : colors.text,
                            fontWeight: today || count > 0 ? '900' : '700',
                          }}
                        >
                          {cell.day}
                        </Text>
                        {count > 0 && (
                          <View
                            style={{
                              marginTop: 2,
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9,
                              paddingHorizontal: 5,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: selected ? 'rgba(255,255,255,0.24)' : colors.primary,
                            }}
                          >
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>{count}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedScheduledBookings.length > 0 ? (
                <View style={{ marginTop: spacing.sm }}>
                  {selectedScheduledBookings.map((booking) => {
                    const statusInfo = getBookingStatusInfo(booking.status);
                    return (
                      <TouchableOpacity
                        key={`scheduled-${booking.id}`}
                        activeOpacity={0.84}
                        onPress={() => goToDetail(booking.id)}
                        style={{
                          paddingVertical: spacing.md,
                          borderTopWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                          <Text style={{ color: colors.text, fontWeight: '900' }}>{booking.time}</Text>
                          <Text style={{ color: statusInfo.color, fontWeight: '900', fontSize: fontSize.xs }}>
                            {statusInfo.label}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                          {booking.pickupLocation} → {booking.dropoffLocation}
                        </Text>
                        <Text style={{ color: colors.primary, fontWeight: '900', marginTop: spacing.xs }}>
                          {booking.estimatedPrice.toLocaleString('vi-VN')}đ
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ color: colors.textSecondary, paddingTop: spacing.sm }}>
                  Ngày này chưa có chuyến đặt trước.
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              Bấm vào để mở lịch tháng và xem ngày có chuyến đặt trước.
            </Text>
          )}
        </View>
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

      {!loading && visibleBookings.length > 0 && (
        <View
          style={{
            marginTop: spacing.sm,
            marginBottom: spacing.sm,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md }}>
              <Wallet size={18} color={colors.primary} />
              <Text style={{ color: colors.text, fontWeight: '900' }}>Thanh toán chuyến đi</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { label: 'Tiền mặt', value: paymentSummary.cash, color: colors.success },
                { label: 'VietQR/CK', value: paymentSummary.transfer, color: colors.primary },
                { label: 'Chờ xác nhận', value: paymentSummary.pendingReview, color: colors.warning },
                { label: 'Đã xác nhận', value: paymentSummary.paid, color: colors.info },
              ].map((item) => (
                <View key={item.label} style={{ width: '50%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{item.label}</Text>
                  <Text style={{ color: item.color, fontWeight: '900', fontSize: 20, marginTop: 2 }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
        </View>
      ) : layoutMode === 'card' ? (
        /* ══ CARD VIEW ══ */
        <View>
          {visibleBookings.map((booking) => (
            <View
              key={booking.id}
              style={{
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                position: 'relative',
              }}
            >
              <TouchableOpacity
                onPress={() => openBookingActions(booking)}
                activeOpacity={0.78}
                style={{
                  position: 'absolute',
                  right: spacing.sm,
                  top: spacing.sm,
                  zIndex: 3,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <MoreVertical size={18} color={colors.text} />
              </TouchableOpacity>
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
            </View>
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
              canCancel={canDriverCancelBooking(booking)}
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
        onDismiss={() => pendingDispatch && setDismissedOfferId(pendingDispatch.id)}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        {pendingOffer && pendingDispatch && (
          <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>
              Bạn có chuyến mới
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text style={{ color: colors.textSecondary, flex: 1 }}>
                {pendingOffer.bookingCode ?? 'Booking'} - {pendingOffer.passengers} khách
              </Text>
              <Text style={{ color: dispatchCountdown <= 10 ? colors.error : colors.primary, fontWeight: '900' }}>
                {dispatchCountdown}s
              </Text>
            </View>
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
                onPress={() => handleAcceptDispatch(pendingDispatch)}
                loading={loadingId === pendingOffer.id}
                style={{ flex: 1 }}
              />
              <Button
                label="Từ chối"
                onPress={() => handleRejectDispatch(pendingDispatch)}
                variant="outline"
                loading={loadingId === pendingOffer.id}
                style={{ flex: 1 }}
              />
            </View>
          </BottomSheetView>
        )}
      </BottomSheetModal>
    </Screen>
  );
}
