import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BarChart3, CalendarClock, ChevronRight, MapPin, MessageCircle, PauseCircle, RefreshCw, RotateCcw, Route, UserRound, Wallet, XCircle } from 'lucide-react-native';
import { Button } from '@/components/BaseComponents';
import type { DriverDashboardRouteState } from '@/components/driver-dashboard/DriverMapView';
import { PaymentStatusBadge, getPaymentMethodLabel } from '@/components/PaymentStatusBadge';
import { useTheme } from '@/theme';
import { borderRadius, fontForWeight, fontSize, spacing } from '@/theme/tokens';
import { Booking } from '@/types';
import { formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';

export type DriverDashboardStats = {
  completed: number;
  active: number;
  revenue: number;
  todayRevenue: number;
  todayCompleted: number;
  weekRevenue: number;
  averageRating: number;
  ratingCount: number;
};

type Props = {
  loading: boolean;
  refreshing: boolean;
  actionLoadingId?: string | null;
  stats: DriverDashboardStats;
  recentBookings: Booking[];
  nearbyBookings: Booking[];
  activeTrip?: Booking | null;
  lastSkippedBooking?: Booking | null;
  todayScheduledBooking?: Booking | null;
  routeState: DriverDashboardRouteState;
  pickupRadiusKm: 2 | 5 | 10;
  pauseUntil?: string | null;
  paymentSummary: { cash: number; transfer: number; pendingReview: number; paid: number };
  onRefresh: () => void;
  onOpenBookings: () => void;
  onOpenBookingDetail: (id: string) => void;
  onOpenSchedule: () => void;
  onOpenRevenue: () => void;
  onOpenChat: () => void;
  onAcceptBooking: (booking: Booking) => void;
  onRejectBooking: (booking: Booking) => void;
  onRestoreSkippedBooking: (booking: Booking) => void;
  onChangePickupRadius: (radius: 2 | 5 | 10) => void;
  onPauseReceiving: (minutes: 15 | 30) => void;
};

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const formatDistance = (meters?: number) => {
  if (!meters) return 'Chưa rõ khoảng cách';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
};

const formatTripDistance = (distance?: number) => {
  if (!distance) return 'Chưa rõ';
  return distance >= 1000 ? (distance / 1000).toFixed(1) + ' km' : distance.toFixed(1) + ' km';
};

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: tone ?? colors.text, fontSize: 18, marginTop: spacing.xs, ...fontForWeight('900') }}>{value}</Text>
    </View>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={{ width: '23%', minHeight: 74, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
      {icon}
      <Text numberOfLines={2} style={{ color: colors.text, textAlign: 'center', fontSize: 10, lineHeight: 13, ...fontForWeight('800') }}>{label}</Text>
    </TouchableOpacity>
  );
}

function RouteSummary({ routeState }: { routeState: DriverDashboardRouteState }) {
  const { colors } = useTheme();
  if (routeState.loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Đang tính ETA theo Goong...</Text>
      </View>
    );
  }
  if (routeState.error) {
    return <Text numberOfLines={1} style={{ color: colors.warning, fontSize: fontSize.xs, marginTop: spacing.xs }}>Chưa tải được route Goong, đang dùng marker vị trí.</Text>;
  }
  if (!routeState.route) return null;
  return (
    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
      {formatDistance(routeState.route.distanceMeters)} • {routeState.route.duration || 'Đang cập nhật ETA'}
    </Text>
  );
}

function TripInfoBreakdown({ booking, routeState }: { booking: Booking; routeState: DriverDashboardRouteState }) {
  const { colors } = useTheme();
  const amount = booking.actualPrice ?? booking.estimatedPrice ?? 0;
  return (
    <View style={{ marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md }}>
        <Metric label="Giá chuyến" value={money(amount)} tone={colors.primary} />
        <Metric label="Khoảng cách chuyến" value={formatTripDistance(booking.distance)} />
        <Metric label="Bạn cách khách" value={routeState.route ? formatDistance(routeState.route.distanceMeters) : routeState.loading ? 'Đang tính...' : 'Chưa rõ'} tone={colors.warning} />
        <Metric label="Dự kiến đến điểm đón" value={routeState.route?.duration ?? (routeState.loading ? 'Đang tính...' : 'Chưa rõ')} />
      </View>
      {!!routeState.error && <Text style={{ color: colors.warning, fontSize: fontSize.xs, marginTop: spacing.xs }}>Chưa tải được route Goong, giá chuyến vẫn giữ theo booking khách đã tạo.</Text>}
    </View>
  );
}
function RadiusSelector({ value, onChange }: { value: 2 | 5 | 10; onChange: (value: 2 | 5 | 10) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, ...fontForWeight('900'), marginBottom: spacing.sm }}>Bán kính nhận chuyến</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[2, 5, 10].map((radius) => {
          const selected = value === radius;
          return (
            <TouchableOpacity key={radius} activeOpacity={0.82} onPress={() => onChange(radius as 2 | 5 | 10)} style={{ flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.full, alignItems: 'center', backgroundColor: selected ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}>
              <Text style={{ color: selected ? '#fff' : colors.text, ...fontForWeight('900') }}>{radius} km</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function BookingRow({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const amount = booking.actualPrice ?? booking.estimatedPrice ?? 0;
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <MapPin size={18} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, ...fontForWeight('900') }}>{booking.pickupLocation}</Text>
            <Text style={{ color: colors.primary, ...fontForWeight('900') }}>{money(amount)}</Text>
          </View>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, marginTop: spacing.xs }}>đến {booking.dropoffLocation}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm }}>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>{booking.time} • {formatVietnamDate(booking.date)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('800') }}>{statusInfo.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
            <PaymentStatusBadge status={booking.paymentStatus} />
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, ...fontForWeight('700') }}>{getPaymentMethodLabel(booking.paymentMethod)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function DriverDashboardSheet({
  loading,
  refreshing,
  actionLoadingId,
  stats,
  recentBookings,
  nearbyBookings,
  activeTrip,
  lastSkippedBooking,
  todayScheduledBooking,
  routeState,
  pickupRadiusKm,
  pauseUntil,
  paymentSummary,
  onRefresh,
  onOpenBookings,
  onOpenBookingDetail,
  onOpenSchedule,
  onOpenRevenue,
  onOpenChat,
  onAcceptBooking,
  onRejectBooking,
  onRestoreSkippedBooking,
  onChangePickupRadius,
  onPauseReceiving,
}: Props) {
  const { colors, isDark } = useTheme();
  const snapPoints = useMemo(() => ['24%', '56%', '90%'], []);
  const primaryNearbyBooking = nearbyBookings[0] ?? null;
  const pauseLabel = pauseUntil ? `Tạm nghỉ đến ${new Date(pauseUntil).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : null;

  return (
    <BottomSheet index={1} snapPoints={snapPoints} enablePanDownToClose={false} backgroundStyle={{ backgroundColor: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28 }} handleIndicatorStyle={{ backgroundColor: colors.textTertiary, width: 44 }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['4xl'] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: 20, ...fontForWeight('900') }}>{activeTrip ? 'Đang trong chuyến' : 'Bảng điều khiển'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>{loading ? 'Đang tải dữ liệu tài xế...' : activeTrip ? `${activeTrip.pickupLocation} → ${activeTrip.dropoffLocation}` : `${nearbyBookings.length} chuyến trong ${pickupRadiusKm} km • ${stats.todayCompleted} chuyến hôm nay`}</Text>
            {!!pauseLabel && <Text style={{ color: colors.warning, fontSize: fontSize.xs, marginTop: spacing.xs, ...fontForWeight('800') }}>{pauseLabel}</Text>}
          </View>
          <TouchableOpacity activeOpacity={0.82} onPress={onRefresh} disabled={refreshing || loading} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, opacity: refreshing || loading ? 0.6 : 1 }}>
            <RefreshCw size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {!!activeTrip && (
          <TouchableOpacity activeOpacity={0.86} onPress={() => onOpenBookingDetail(activeTrip.id)} style={{ marginBottom: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary + '14' }}>
            <Route size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, ...fontForWeight('900') }}>Tiếp tục xử lý chuyến hiện tại</Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>{activeTrip.customerName} • {activeTrip.pickupLocation}</Text>
              <TripInfoBreakdown booking={activeTrip} routeState={routeState} />
            </View>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {!activeTrip && <RadiusSelector value={pickupRadiusKm} onChange={onChangePickupRadius} />}

        {!activeTrip && !!lastSkippedBooking && (
          <View style={{ marginBottom: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <RotateCcw size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSize.sm, ...fontForWeight('900') }}>Vừa bỏ qua chuyến</Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{lastSkippedBooking.pickupLocation}</Text>
            </View>
            <Button label="Hoàn tác" size="sm" variant="outline" onPress={() => onRestoreSkippedBooking(lastSkippedBooking)} />
          </View>
        )}
        {!activeTrip && !!primaryNearbyBooking && (
          <View style={{ marginBottom: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.warning, backgroundColor: colors.warning + '12' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm }}>
              <UserRound size={24} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.warning, ...fontForWeight('900') }}>Chuyến gần đang tìm tài xế</Text>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSize.sm, marginTop: 2 }}>{primaryNearbyBooking.pickupLocation}</Text>
                <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>đến {primaryNearbyBooking.dropoffLocation}</Text>
                <TripInfoBreakdown booking={primaryNearbyBooking} routeState={routeState} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, marginTop: spacing.md }}>
              <Button label="Nhận chuyến" size="sm" loading={actionLoadingId === primaryNearbyBooking.id} disabled={!!actionLoadingId} onPress={() => onAcceptBooking(primaryNearbyBooking)} style={{ flex: 1 }} />
              <Button label="Bỏ qua" size="sm" variant="outline" disabled={!!actionLoadingId} onPress={() => onRejectBooking(primaryNearbyBooking)} icon={<XCircle size={15} color={colors.primary} />} />
            </View>
          </View>
        )}

        {!activeTrip && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <PauseCircle size={19} color={colors.warning} />
            <Button label="Tạm nghỉ 15 phút" size="sm" variant="outline" onPress={() => onPauseReceiving(15)} style={{ flex: 1 }} />
            <Button label="30 phút" size="sm" variant="outline" onPress={() => onPauseReceiving(30)} />
          </View>
        )}

        {!!todayScheduledBooking && !activeTrip && (
          <TouchableOpacity activeOpacity={0.86} onPress={() => onOpenBookingDetail(todayScheduledBooking.id)} style={{ marginBottom: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.warning, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.warning + '14' }}>
            <CalendarClock size={24} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.warning, fontSize: fontSize.sm, ...fontForWeight('900') }}>Bạn có chuyến đặt trước hôm nay</Text>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>{new Date(todayScheduledBooking.scheduledStartAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {todayScheduledBooking.pickupLocation}</Text>
            </View>
            <ChevronRight size={18} color={colors.warning} />
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md }}>
          <QuickAction label="Lịch" icon={<CalendarClock size={22} color={colors.primary} />} onPress={onOpenSchedule} />
          <QuickAction label="Doanh thu" icon={<Wallet size={22} color={colors.success} />} onPress={onOpenRevenue} />
          <QuickAction label="Chuyến đi" icon={<Route size={22} color={colors.info} />} onPress={onOpenBookings} />
          <QuickAction label="Tin nhắn" icon={<MessageCircle size={22} color={colors.warning} />} onPress={onOpenChat} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, marginBottom: spacing.lg }}>
          <Metric label="Hôm nay" value={money(stats.todayRevenue)} tone={colors.success} />
          <Metric label="7 ngày" value={money(stats.weekRevenue)} tone={colors.primary} />
          <Metric label="Hoàn thành" value={String(stats.completed)} />
          <Metric label="Đánh giá" value={stats.ratingCount ? `${stats.averageRating.toFixed(1)}/5` : '--'} tone={colors.warning} />
        </View>

        <TouchableOpacity activeOpacity={0.84} onPress={onOpenRevenue} style={{ marginBottom: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <BarChart3 size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...fontForWeight('900') }}>Thống kê thanh toán</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>Tiền mặt {paymentSummary.cash} • Chuyển khoản {paymentSummary.transfer} • Chờ duyệt {paymentSummary.pendingReview}</Text>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, ...fontForWeight('900') }}>Chuyến đi gần đây</Text>
            <Button label="Xem tất cả" size="sm" variant="outline" onPress={onOpenBookings} />
          </View>
          {loading ? (
            <View style={{ paddingVertical: spacing.lg, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textSecondary }}>Đang tải chuyến đi...</Text>
            </View>
          ) : recentBookings.length === 0 ? (
            <View style={{ paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text, ...fontForWeight('900') }}>Chưa có chuyến đi</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>Khi bạn nhận hoặc hoàn thành chuyến, danh sách gần đây sẽ xuất hiện tại đây.</Text>
            </View>
          ) : (
            recentBookings.map((booking) => <BookingRow key={booking.id} booking={booking} onPress={() => onOpenBookingDetail(booking.id)} />)
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}





