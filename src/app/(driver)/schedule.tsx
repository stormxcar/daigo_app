import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  Banknote,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
} from 'lucide-react-native';
import { TextInput } from '@/components/BaseComponents';
import { CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { PaymentStatusBadge, getPaymentMethodLabel } from '@/components/PaymentStatusBadge';
import { BOOKING_STATUS } from '@/constants';
import { apiClient } from '@/services/api';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Booking } from '@/types';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { showError, showSuccess } from '@/utils/toast';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

type ScheduleScope = 'day' | 'month';
type ScheduleStatusFilter = 'all' | 'pending' | 'accepted' | 'completed' | 'cancelled';
type ScheduleSortMode = 'time_asc' | 'time_desc' | 'price_desc' | 'price_asc' | 'newest';
type DriverScheduleBlock = { id: string; startAt: string; endAt: string };

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
  const cells: Array<{ date: string; day: number } | null> = [];

  for (let index = 0; index < leadingEmpty; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toLocalIsoDate(new Date(year, month, day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const matchesStatusFilter = (booking: Booking, filter: ScheduleStatusFilter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER;
  if (filter === 'accepted') {
    return [BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED, BOOKING_STATUS.SCHEDULED_UPCOMING].includes(booking.status as any);
  }
  if (filter === 'completed') return booking.status === BOOKING_STATUS.TRIP_COMPLETED;
  return [
    BOOKING_STATUS.SCHEDULED_DRIVER_REJECTED,
    BOOKING_STATUS.SCHEDULED_CANCELLED,
    BOOKING_STATUS.CUSTOMER_CANCELLED,
    BOOKING_STATUS.DRIVER_CANCELLED,
    BOOKING_STATUS.EXPIRED,
  ].includes(booking.status as any);
};

const sortBookings = (items: Booking[], sortMode: ScheduleSortMode) => {
  const sorted = [...items];
  if (sortMode === 'time_asc') return sorted.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  if (sortMode === 'time_desc') return sorted.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  if (sortMode === 'price_desc') return sorted.sort((a, b) => b.estimatedPrice - a.estimatedPrice);
  if (sortMode === 'price_asc') return sorted.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
  return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? 'white' : colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('900')}}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ScheduleBookingRow({
  booking,
  loading,
  onAccept,
  onReject,
  onOpen,
}: {
  booking: Booking;
  loading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const canRespond = booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onOpen}
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.text, ...fontForWeight('900')}}>
            {booking.bookingCode ?? 'Chuyến đặt trước'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
            {formatVietnamDate(booking.date)} lúc {booking.time}
          </Text>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            backgroundColor: statusInfo.color + '20',
          }}
        >
          <Text style={{ color: statusInfo.color, fontSize: 10, ...fontForWeight('900')}}>{statusInfo.label}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MapPin size={14} color={colors.primary} />
          <Text numberOfLines={1} style={{ color: colors.textSecondary, flex: 1, fontSize: fontSize.sm }}>
            {booking.pickupLocation}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MapPin size={14} color={colors.error} />
          <Text numberOfLines={1} style={{ color: colors.textSecondary, flex: 1, fontSize: fontSize.sm }}>
            {booking.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <User size={13} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{booking.customerName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Banknote size={13} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: fontSize.xs, ...fontForWeight('900')}}>
            {booking.estimatedPrice.toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <PaymentStatusBadge status={booking.paymentStatus} />
        <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, ...fontForWeight('700')}}>
          {getPaymentMethodLabel(booking.paymentMethod)}
        </Text>
      </View>

      {booking.note ? (
        <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm }}>
          Ghi chú: {booking.note}
        </Text>
      ) : null}

      {canRespond ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.84}
            onPress={onAccept}
            style={{
              flex: 1,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              backgroundColor: colors.primary,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.sm, ...fontForWeight('900')}}>Nhận lịch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.84}
            onPress={onReject}
            style={{
              flex: 1,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              backgroundColor: colors.error + '18',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.error, fontSize: fontSize.sm, ...fontForWeight('900')}}>Từ chối</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function DriverScheduleScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<DriverScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toLocalIsoDate(new Date()));
  const [scope, setScope] = useState<ScheduleScope>('day');
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>('all');
  const [sortMode, setSortMode] = useState<ScheduleSortMode>('time_asc');
  const [query, setQuery] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [data, blocks] = await Promise.all([
        apiClient.getDriverScheduledBookingsByMonth(user.id, month),
        apiClient.getDriverScheduleBlocks(user.id, month),
      ]);
      setBookings(data);
      setScheduleBlocks(blocks);
    } catch (error: any) {
      showError('Không thể tải lịch đặt trước', error.message);
    } finally {
      setLoading(false);
    }
  }, [month, user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.id) return;

    const channel = supabase
      .channel(`driver-schedule-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchSchedule)
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [fetchSchedule, user?.id]);

  const monthCells = useMemo(() => buildMonthGrid(month), [month]);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.forEach((booking) => {
      counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1);
    });
    return counts;
  }, [bookings]);

  const blockCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scheduleBlocks.forEach((block) => {
      const date = toLocalIsoDate(new Date(block.startAt));
      counts.set(date, (counts.get(date) ?? 0) + 1);
    });
    return counts;
  }, [scheduleBlocks]);

  const selectedBlocks = useMemo(
    () => scheduleBlocks.filter((block) => toLocalIsoDate(new Date(block.startAt)) === selectedDate),
    [scheduleBlocks, selectedDate],
  );

  const stats = useMemo(() => {
    const pending = bookings.filter((booking) => booking.status === BOOKING_STATUS.SCHEDULED_PENDING_DRIVER).length;
    const accepted = bookings.filter((booking) =>
      [BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED, BOOKING_STATUS.SCHEDULED_UPCOMING].includes(booking.status as any)
    ).length;
    const completed = bookings.filter((booking) => booking.status === BOOKING_STATUS.TRIP_COMPLETED);
    return {
      total: bookings.length,
      pending,
      accepted,
      completed: completed.length,
      revenue: completed.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice), 0),
    };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = bookings.filter((booking) => {
      if (scope === 'day' && booking.date !== selectedDate) return false;
      if (!matchesStatusFilter(booking, statusFilter)) return false;
      if (!normalizedQuery) return true;
      return [
        booking.bookingCode,
        booking.customerName,
        booking.customerPhone,
        booking.pickupLocation,
        booking.dropoffLocation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
    return sortBookings(filtered, sortMode);
  }, [bookings, query, scope, selectedDate, sortMode, statusFilter]);

  const moveMonth = (offset: number) => {
    setMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      setSelectedDate(toLocalIsoDate(next));
      return next;
    });
  };

  const openBooking = (bookingId: string) => {
    router.push({ pathname: '/(driver)/booking-detail' as any, params: { id: bookingId } });
  };

  const acceptBooking = async (booking: Booking) => {
    try {
      setLoadingId(booking.id);
      await apiClient.acceptScheduledBooking(booking.id);
      await fetchSchedule();
      showSuccess('Đã nhận lịch', 'Chuyến đặt trước đã được thêm vào lịch của bạn.');
    } catch (error: any) {
      showError('Không thể nhận lịch', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const rejectBooking = (booking: Booking) => {
    Alert.alert('Từ chối chuyến đặt trước?', 'Chuyến này sẽ không còn nằm trong lịch chờ của bạn.', [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoadingId(booking.id);
            await apiClient.rejectScheduledBooking(booking.id);
            await fetchSchedule();
            showSuccess('Đã từ chối lịch', 'Trạng thái chuyến đã được cập nhật.');
          } catch (error: any) {
            showError('Không thể từ chối lịch', error.message);
          } finally {
            setLoadingId(null);
          }
        },
      },
    ]);
  };

  const createBlockForSelectedDay = async (mode: 'all_day' | 'midday') => {
    if (!user?.id) return;
    const [year, monthValue, day] = selectedDate.split('-').map(Number);
    const startAt = mode === 'all_day'
      ? new Date(year, monthValue - 1, day, 0, 0, 0, 0)
      : new Date(year, monthValue - 1, day, 11, 0, 0, 0);
    const endAt = mode === 'all_day'
      ? new Date(year, monthValue - 1, day, 23, 59, 59, 999)
      : new Date(year, monthValue - 1, day, 14, 0, 0, 0);

    try {
      setBlocking(true);
      await apiClient.createDriverScheduleBlock({
        driverId: user.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      await fetchSchedule();
      showSuccess(
        'Đã khóa lịch',
        mode === 'all_day' ? 'Ngày này sẽ không nhận chuyến đặt trước.' : 'Khung nghỉ đã được thêm vào lịch.',
      );
    } catch (error: any) {
      showError('Không thể khóa lịch', error.message);
    } finally {
      setBlocking(false);
    }
  };

  const deleteScheduleBlock = async (block: DriverScheduleBlock) => {
    try {
      setBlocking(true);
      await apiClient.deleteDriverScheduleBlock(block.id);
      await fetchSchedule();
      showSuccess('Đã mở lại lịch', 'Khung nghỉ đã được xóa.');
    } catch (error: any) {
      showError('Không thể xóa khung nghỉ', error.message);
    } finally {
      setBlocking(false);
    }
  };

  return (
    <Screen scroll refreshing={loading} onRefresh={fetchSchedule}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 22, ...fontForWeight('900')}}>Quản lý lịch</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 3 }}>
          Theo dõi chuyến đặt trước theo ngày, tháng và trạng thái xử lý.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('800')}}>Tổng lịch</Text>
          <Text style={{ color: colors.text, fontSize: 20, ...fontForWeight('900'), marginTop: 2 }}>{stats.total}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('800')}}>Chờ nhận</Text>
          <Text style={{ color: colors.warning, fontSize: 20, ...fontForWeight('900'), marginTop: 2 }}>{stats.pending}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, padding: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('800')}}>Doanh thu</Text>
          <Text style={{ color: colors.primary, fontSize: 15, ...fontForWeight('900'), marginTop: 5 }}>
            {stats.revenue.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => moveMonth(-1)}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, ...fontForWeight('900')}}>{getMonthLabel(month)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
              Ngày đang chọn: {formatVietnamDate(selectedDate)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => moveMonth(1)}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg }}>
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={{ flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('900'), paddingBottom: spacing.xs }}>
              {label}
            </Text>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg }}>
          {monthCells.map((cell, index) => {
            if (!cell) return <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
            const selected = selectedDate === cell.date;
            const today = toLocalIsoDate(new Date()) === cell.date;
            const count = dayCounts.get(cell.date) ?? 0;
            const blocked = (blockCounts.get(cell.date) ?? 0) > 0;
            const isFull = blocked || count >= 3;
            return (
              <TouchableOpacity
                key={cell.date}
                activeOpacity={0.84}
                onPress={() => {
                  setSelectedDate(cell.date);
                  setScope('day');
                }}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : isFull ? colors.error + '18' : count > 0 ? colors.primary + '14' : colors.surfaceAlt,
                    borderWidth: today || count > 0 || isFull ? 1 : 0,
                    borderColor: selected ? colors.primary : isFull ? colors.error : today ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: selected ? 'white' : colors.text, ...fontForWeight(today || count > 0 ? '900' : '700')}}>
                    {cell.day}
                  </Text>
                  {count > 0 ? (
                    <View
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        marginTop: 2,
                        paddingHorizontal: 5,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? 'rgba(255,255,255,0.24)' : colors.primary,
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, ...fontForWeight('900')}}>{count}</Text>
                    </View>
                  ) : null}
                  {isFull ? (
                    <Text style={{ color: selected ? 'white' : colors.error, fontSize: 8, ...fontForWeight('900'), marginTop: 1 }}>
                      {blocked ? 'NGHỈ' : 'KÍN'}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo khách, SĐT, điểm đón, điểm đến..."
          icon={<Search size={18} color={colors.textTertiary} />}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
          <Pill label="Ngày đang chọn" active={scope === 'day'} onPress={() => setScope('day')} />
          <Pill label="Cả tháng" active={scope === 'month'} onPress={() => setScope('month')} />
        </View>

        <View
          style={{
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md }}>
            <Ban size={17} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...fontForWeight('900')}}>Block thời gian nghỉ</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                Khóa ngày hoặc khung nghỉ để khách không đặt trước trùng lịch.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.md }}>
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={blocking}
              onPress={() => createBlockForSelectedDay('all_day')}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.full,
                backgroundColor: colors.error + '14',
                borderWidth: 1,
                borderColor: colors.error + '45',
                opacity: blocking ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.error, ...fontForWeight('900'), fontSize: fontSize.xs }}>Nghỉ cả ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={blocking}
              onPress={() => createBlockForSelectedDay('midday')}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.full,
                backgroundColor: colors.warning + '14',
                borderWidth: 1,
                borderColor: colors.warning + '45',
                opacity: blocking ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.warning, ...fontForWeight('900'), fontSize: fontSize.xs }}>Nghỉ 11:00-14:00</Text>
            </TouchableOpacity>
          </View>
          {selectedBlocks.length > 0 && (
            <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
              {selectedBlocks.map((block) => (
                <View
                  key={block.id}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, flex: 1, fontSize: fontSize.xs, ...fontForWeight('800')}}>
                    {new Date(block.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(block.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <TouchableOpacity activeOpacity={0.84} disabled={blocking} onPress={() => deleteScheduleBlock(block)}>
                    <Trash2 size={17} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm }}>
          <Filter size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, ...fontForWeight('900')}}>Trạng thái</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill label="Tất cả" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          <Pill label="Chờ nhận" active={statusFilter === 'pending'} onPress={() => setStatusFilter('pending')} />
          <Pill label="Đã nhận" active={statusFilter === 'accepted'} onPress={() => setStatusFilter('accepted')} />
          <Pill label="Hoàn thành" active={statusFilter === 'completed'} onPress={() => setStatusFilter('completed')} />
          <Pill label="Hủy/từ chối" active={statusFilter === 'cancelled'} onPress={() => setStatusFilter('cancelled')} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SlidersHorizontal size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.text, ...fontForWeight('900')}}>Sắp xếp</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill label="Giờ sớm nhất" active={sortMode === 'time_asc'} onPress={() => setSortMode('time_asc')} />
          <Pill label="Giờ muộn nhất" active={sortMode === 'time_desc'} onPress={() => setSortMode('time_desc')} />
          <Pill label="Giá cao" active={sortMode === 'price_desc'} onPress={() => setSortMode('price_desc')} />
          <Pill label="Giá thấp" active={sortMode === 'price_asc'} onPress={() => setSortMode('price_asc')} />
          <Pill label="Mới tạo" active={sortMode === 'newest'} onPress={() => setSortMode('newest')} />
        </View>
      </View>

      <View style={{ paddingTop: spacing.lg }}>
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.text, ...fontForWeight('900')}}>
              {scope === 'day' ? `Chuyến ngày ${formatVietnamDate(selectedDate)}` : `Chuyến ${getMonthLabel(month).toLowerCase()}`}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
              {visibleBookings.length} chuyến phù hợp bộ lọc
            </Text>
          </View>
          <CheckCircle2 size={19} color={colors.success} />
        </View>

        {loading ? (
          <View style={{ gap: spacing.sm }}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : visibleBookings.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {visibleBookings.map((booking) => (
              <ScheduleBookingRow
                key={booking.id}
                booking={booking}
                loading={loadingId === booking.id}
                onOpen={() => openBooking(booking.id)}
                onAccept={() => acceptBooking(booking)}
                onReject={() => rejectBooking(booking)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<CalendarDays size={42} color={colors.textTertiary} />}
            title="Không có chuyến đặt trước"
            description="Thử đổi ngày, chuyển sang cả tháng hoặc bỏ bớt bộ lọc."
          />
        )}
      </View>
    </Screen>
  );
}
