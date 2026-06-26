import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { BarChart3, CalendarDays, CheckCircle2, Filter, TrendingUp, Wallet } from 'lucide-react-native';
import { Button, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { BOOKING_STATUS } from '@/constants';
import { Booking } from '@/types';
import { formatVietnamDate } from '@/utils/helpers';
import { showError } from '@/utils/toast';

type RevenueRange = 'day' | 'month' | 'year';
type RevenueSort = 'newest' | 'highest';

const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')}đ`;

const getBookingDate = (booking: Booking) => {
  const parsed = new Date(booking.date || booking.createdAt);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
};

const startOfRange = (date: Date, range: RevenueRange) => {
  if (range === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (range === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), 0, 1);
};

const endOfRange = (date: Date, range: RevenueRange) => {
  if (range === 'day') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  if (range === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear() + 1, 0, 1);
};

const shiftRange = (date: Date, range: RevenueRange, direction: number) => {
  const next = new Date(date);
  if (range === 'day') next.setDate(next.getDate() + direction);
  if (range === 'month') next.setMonth(next.getMonth() + direction);
  if (range === 'year') next.setFullYear(next.getFullYear() + direction);
  return next;
};

const getRangeLabel = (date: Date, range: RevenueRange) => {
  if (range === 'day') return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (range === 'month') return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  return `Năm ${date.getFullYear()}`;
};

const buildRevenueBuckets = (bookings: Booking[], date: Date, range: RevenueRange) => {
  if (range === 'day') {
    return [0, 4, 8, 12, 16, 20].map((hour) => {
      const revenue = bookings
        .filter((booking) => {
          const bookingDate = getBookingDate(booking);
          return bookingDate.getHours() >= hour && bookingDate.getHours() < hour + 4;
        })
        .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
      return { label: `${String(hour).padStart(2, '0')}h`, revenue };
    });
  }

  if (range === 'month') {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const step = daysInMonth > 29 ? 5 : 4;
    return Array.from({ length: Math.ceil(daysInMonth / step) }).map((_, index) => {
      const startDay = index * step + 1;
      const endDay = Math.min(daysInMonth, startDay + step - 1);
      const revenue = bookings
        .filter((booking) => {
          const day = getBookingDate(booking).getDate();
          return day >= startDay && day <= endDay;
        })
        .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
      return { label: `${startDay}-${endDay}`, revenue };
    });
  }

  return Array.from({ length: 12 }).map((_, index) => {
    const revenue = bookings
      .filter((booking) => getBookingDate(booking).getMonth() === index)
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    return { label: `T${index + 1}`, revenue };
  });
};

function RevenueSection({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      {children}
    </View>
  );
}

export default function DriverRevenueScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RevenueRange>('month');
  const [date, setDate] = useState(() => new Date());
  const [sort, setSort] = useState<RevenueSort>('newest');

  const loadData = async (manual = false) => {
    if (!user?.id) return;
    try {
      manual ? setRefreshing(true) : setLoading(true);
      const data = await apiClient.getBookings({ driverId: user.id, page: 1, pageSize: 500 });
      setBookings(data);
    } catch (error: any) {
      showError('Không thể tải doanh thu', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const revenue = useMemo(() => {
    const start = startOfRange(date, range);
    const end = endOfRange(date, range);
    const completed = bookings.filter((booking) => booking.status === BOOKING_STATUS.TRIP_COMPLETED);
    const rangeBookings = completed.filter((booking) => {
      const bookingDate = getBookingDate(booking);
      return bookingDate >= start && bookingDate < end;
    });
    const sortedBookings = [...rangeBookings].sort((a, b) => {
      if (sort === 'highest') {
        return (b.actualPrice ?? b.estimatedPrice ?? 0) - (a.actualPrice ?? a.estimatedPrice ?? 0);
      }
      return getBookingDate(b).getTime() - getBookingDate(a).getTime();
    });
    const total = rangeBookings.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const cash = rangeBookings
      .filter((booking) => booking.paymentMethod === 'cash')
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const transfer = rangeBookings
      .filter((booking) => booking.paymentMethod === 'vietqr' || booking.paymentMethod === 'bank_transfer')
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const paid = rangeBookings
      .filter((booking) => ['paid', 'driver_verified'].includes(booking.paymentStatus ?? 'unpaid'))
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const pending = rangeBookings
      .filter((booking) => ['pending', 'submitted', 'rejected'].includes(booking.paymentStatus ?? 'unpaid'))
      .reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    const distance = rangeBookings.reduce((sum, booking) => sum + (booking.distance ?? 0), 0);
    const buckets = buildRevenueBuckets(rangeBookings, date, range);
    const maxBucket = Math.max(...buckets.map((bucket) => bucket.revenue), 1);

    return {
      bookings: sortedBookings,
      buckets: buckets.map((bucket) => ({ ...bucket, height: Math.max(8, Math.round((bucket.revenue / maxBucket) * 132)) })),
      total,
      cash,
      transfer,
      paid,
      pending,
      distance,
      trips: rangeBookings.length,
      average: rangeBookings.length ? total / rangeBookings.length : 0,
    };
  }, [bookings, date, range, sort]);

  return (
    <Screen scroll refreshing={refreshing || loading} onRefresh={() => loadData(true)}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>Doanh thu tài xế</Text>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
          Theo dõi thu nhập, thanh toán và hiệu suất chuyến hoàn thành.
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <CardSkeleton style={{ marginBottom: spacing.md }} />
          <CardSkeleton style={{ marginBottom: spacing.md }} />
        </View>
      ) : (
        <>
          <RevenueSection>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {[
                { key: 'day', label: 'Ngày' },
                { key: 'month', label: 'Tháng' },
                { key: 'year', label: 'Năm' },
              ].map((item) => {
                const active = range === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setRange(item.key as RevenueRange)}
                    activeOpacity={0.82}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.full,
                      backgroundColor: active ? colors.primary : colors.surfaceAlt,
                    }}
                  >
                    <Text style={{ color: active ? 'white' : colors.text, fontWeight: '900', fontSize: fontSize.sm }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button label="Trước" size="sm" variant="outline" onPress={() => setDate((current) => shiftRange(current, range, -1))} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <CalendarDays size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontWeight: '900' }}>{getRangeLabel(date, range)}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                  {revenue.trips} chuyến hoàn thành
                </Text>
              </View>
              <Button label="Sau" size="sm" variant="outline" onPress={() => setDate((current) => shiftRange(current, range, 1))} />
            </View>
          </RevenueSection>

          <RevenueSection>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { label: 'Tổng doanh thu', value: money(revenue.total), icon: <Wallet size={16} color={colors.success} /> },
                { label: 'TB/chuyến', value: money(revenue.average), icon: <TrendingUp size={16} color={colors.primary} /> },
                { label: 'Đã xác nhận', value: money(revenue.paid), icon: <CheckCircle2 size={16} color={colors.success} /> },
                { label: 'Chờ xử lý', value: money(revenue.pending), icon: <Filter size={16} color={colors.warning} /> },
              ].map((item, index) => (
                <View
                  key={item.label}
                  style={{
                    width: '50%',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.sm,
                    borderBottomWidth: index < 2 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
                    {item.icon}
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '800' }}>{item.label}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </RevenueSection>

          <RevenueSection>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <BarChart3 size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontWeight: '900' }}>Biểu đồ doanh thu</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{revenue.distance.toFixed(1)} km</Text>
            </View>
            <View style={{ height: 168, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
              {revenue.buckets.map((bucket) => (
                <View key={bucket.label} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: '72%',
                      height: bucket.height,
                      borderRadius: 7,
                      backgroundColor: bucket.revenue > 0 ? colors.primary : colors.surfaceAlt,
                    }}
                  />
                  <Text numberOfLines={1} style={{ color: colors.textTertiary, fontSize: 9, marginTop: spacing.xs }}>
                    {bucket.label}
                  </Text>
                </View>
              ))}
            </View>
          </RevenueSection>

          <RevenueSection>
            <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.sm }}>Cơ cấu thanh toán</Text>
            {[
              { label: 'Tiền mặt', value: revenue.cash, color: colors.success },
              { label: 'VietQR / chuyển khoản', value: revenue.transfer, color: colors.primary },
            ].map((item) => {
              const percent = revenue.total ? Math.round((item.value / revenue.total) * 100) : 0;
              return (
                <View key={item.label} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{item.label}</Text>
                    <Text style={{ color: colors.text, fontWeight: '900', fontSize: fontSize.sm }}>{money(item.value)} · {percent}%</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                    <View style={{ width: `${percent}%`, height: '100%', backgroundColor: item.color }} />
                  </View>
                </View>
              );
            })}
          </RevenueSection>

          <RevenueSection>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>Chi tiết chuyến doanh thu</Text>
              <TouchableOpacity
                onPress={() => setSort((current) => current === 'newest' ? 'highest' : 'newest')}
                activeOpacity={0.82}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.full }}
              >
                <Text style={{ color: colors.primary, fontWeight: '900', fontSize: fontSize.xs }}>
                  {sort === 'newest' ? 'Mới nhất' : 'Cao nhất'}
                </Text>
              </TouchableOpacity>
            </View>
            {revenue.bookings.length === 0 ? (
              <EmptyState
                title="Chưa có doanh thu"
                description="Không có chuyến hoàn thành trong khoảng thời gian này."
                icon={<Wallet size={42} color={colors.primary} />}
              />
            ) : (
              revenue.bookings.map((booking, index) => (
                <TouchableOpacity
                  key={booking.id}
                  activeOpacity={0.82}
                  onPress={() => router.push({ pathname: '/(driver)/booking-detail' as any, params: { id: booking.id } })}
                  style={{
                    paddingVertical: spacing.sm,
                    borderBottomWidth: index === revenue.bookings.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                    <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '900', flex: 1 }}>
                      {booking.pickupLocation}
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: '900' }}>
                      {money(booking.actualPrice ?? booking.estimatedPrice ?? 0)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: colors.textSecondary, marginTop: 3 }}>
                    đến {booking.dropoffLocation}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 3 }}>
                    {booking.time} - {formatVietnamDate(booking.date)} · {booking.paymentMethod === 'cash' ? 'Tiền mặt' : 'VietQR/CK'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </RevenueSection>
        </>
      )}
    </Screen>
  );
}
