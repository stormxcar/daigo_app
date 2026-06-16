import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { BOOKING_STATUS } from '@/constants';
import { Booking, BookingStatus } from '@/types';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { getBookingStatusInfo } from '@/utils/helpers';

export type BookingStatusFilter = 'all' | 'active' | 'completed' | 'cancelled' | BookingStatus;
export type BookingSortMode = 'newest' | 'oldest' | 'date_asc' | 'price_desc' | 'price_asc';

interface BookingListControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: BookingStatusFilter;
  onStatusFilterChange: (value: BookingStatusFilter) => void;
  sortMode: BookingSortMode;
  onSortModeChange: (value: BookingSortMode) => void;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
  activeCount?: number;
  onReset?: () => void;
}

const statusOptions: { label: string; value: BookingStatusFilter }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đang đi', value: 'active' },
  { label: 'Hoàn thành', value: 'completed' },
  { label: 'Đã hủy', value: 'cancelled' },
  { label: getBookingStatusInfo(BOOKING_STATUS.SEARCHING_DRIVER).label, value: BOOKING_STATUS.SEARCHING_DRIVER },
  { label: getBookingStatusInfo(BOOKING_STATUS.DRIVER_ACCEPTED).label, value: BOOKING_STATUS.DRIVER_ACCEPTED },
  { label: getBookingStatusInfo(BOOKING_STATUS.TRIP_STARTED).label, value: BOOKING_STATUS.TRIP_STARTED },
];

const sortOptions: { label: string; value: BookingSortMode }[] = [
  { label: 'Mới nhất', value: 'newest' },
  { label: 'Cũ nhất', value: 'oldest' },
  { label: 'Ngày đi gần', value: 'date_asc' },
  { label: 'Giá cao', value: 'price_desc' },
  { label: 'Giá thấp', value: 'price_asc' },
];

export function filterAndSortBookings(bookings: Booking[], query: string, statusFilter: BookingStatusFilter, sortMode: BookingSortMode) {
  const keyword = query.trim().toLowerCase();

  return bookings
    .filter((booking) => {
      if (!keyword) return true;
      return [
        booking.bookingCode,
        booking.pickupLocation,
        booking.dropoffLocation,
        booking.customerName,
        booking.driverName,
        booking.vehicle?.name,
        booking.vehicle?.licensePlate,
        booking.note,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    })
    .filter((booking) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') {
        return [
          BOOKING_STATUS.SEARCHING_DRIVER,
          BOOKING_STATUS.DRIVER_ACCEPTED,
          BOOKING_STATUS.DRIVER_ARRIVING,
          BOOKING_STATUS.DRIVER_ARRIVED,
          BOOKING_STATUS.TRIP_STARTED,
        ].includes(booking.status as any);
      }
      if (statusFilter === 'completed') return booking.status === BOOKING_STATUS.TRIP_COMPLETED;
      if (statusFilter === 'cancelled') {
        return [BOOKING_STATUS.CUSTOMER_CANCELLED, BOOKING_STATUS.DRIVER_CANCELLED, BOOKING_STATUS.EXPIRED].includes(booking.status as any);
      }
      return booking.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortMode === 'date_asc') return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
      if (sortMode === 'price_desc') return (b.actualPrice ?? b.estimatedPrice ?? 0) - (a.actualPrice ?? a.estimatedPrice ?? 0);
      if (sortMode === 'price_asc') return (a.actualPrice ?? a.estimatedPrice ?? 0) - (b.actualPrice ?? b.estimatedPrice ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function BookingListControls({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  expanded,
  onExpandedChange,
  activeCount = 0,
  onReset,
}: BookingListControlsProps) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => onExpandedChange(!expanded)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.md,
          borderRadius: borderRadius.lg,
          backgroundColor: colors.surfaceAlt,
          marginBottom: expanded ? spacing.md : 0,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SlidersHorizontal size={18} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '900' }}>Tìm kiếm chuyến đi</Text>
          {activeCount > 0 && (
            <View style={{ minWidth: 22, height: 22, borderRadius: borderRadius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: fontSize.xs }}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: colors.primary, fontWeight: '800' }}>{expanded ? 'Thu gọn' : 'Mở'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View>
          <TextInput
            placeholder="Tìm mã chuyến, điểm đón, điểm đến, tài xế, biển số..."
            value={query}
            onChangeText={onQueryChange}
            icon={<Search size={18} color={colors.textSecondary} />}
            style={{ marginBottom: spacing.md }}
          />

          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.sm }}>Trạng thái</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onStatusFilterChange(option.value)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.full,
                  backgroundColor: statusFilter === option.value ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: statusFilter === option.value ? 'white' : colors.text, fontWeight: '700', fontSize: fontSize.sm }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.sm }}>Sắp xếp</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onSortModeChange(option.value)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.full,
                  backgroundColor: sortMode === option.value ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: sortMode === option.value ? 'white' : colors.text, fontWeight: '700', fontSize: fontSize.sm }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!onReset && <Button label="Đặt lại bộ lọc" onPress={onReset} variant="outline" size="sm" />}
        </View>
      )}
    </View>
  );
}
