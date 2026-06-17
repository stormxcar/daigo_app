import React from 'react';
import { Text, View } from 'react-native';
import { CheckCircle2, Circle, Clock3 } from 'lucide-react-native';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';

type BookingTimelineProps = {
  status: string;
  compact?: boolean;
};

const ACTIVE_STEPS = [
  {
    status: BOOKING_STATUS.SEARCHING_DRIVER,
    title: 'Tìm tài xế',
    description: 'Hệ thống đang gửi yêu cầu đến tài xế phù hợp.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ACCEPTED,
    title: 'Tài xế nhận chuyến',
    description: 'Tài xế đã xác nhận và chuẩn bị di chuyển.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ARRIVING,
    title: 'Đang đến điểm đón',
    description: 'Theo dõi vị trí tài xế trên bản đồ realtime.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ARRIVED,
    title: 'Đã đến điểm đón',
    description: 'Tài xế đã tới nơi, khách hàng có thể ra xe.',
  },
  {
    status: BOOKING_STATUS.TRIP_STARTED,
    title: 'Đang di chuyển',
    description: 'Chuyến đi đã bắt đầu theo lộ trình đã chọn.',
  },
  {
    status: BOOKING_STATUS.TRIP_COMPLETED,
    title: 'Hoàn thành',
    description: 'Chuyến đi đã kết thúc và được lưu vào lịch sử.',
  },
];

export function BookingTimeline({ status, compact = false }: BookingTimelineProps) {
  const { colors } = useTheme();
  const isCancelled = TERMINAL_BOOKING_STATUSES.includes(status as any) && status !== BOOKING_STATUS.TRIP_COMPLETED;
  const currentIndex = ACTIVE_STEPS.findIndex((step) => step.status === status);
  const effectiveIndex = currentIndex >= 0 ? currentIndex : status === BOOKING_STATUS.CREATED ? 0 : -1;

  if (isCancelled) {
    return (
      <View style={{ padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}>
        <Text style={{ color: colors.error, fontWeight: '900', fontSize: fontSize.base }}>Chuyến đi đã dừng</Text>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
          Chuyến này đã bị hủy hoặc hết hạn. Các thao tác điều hướng sẽ không còn khả dụng.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: compact ? spacing.sm : spacing.md }}>
      {ACTIVE_STEPS.map((step, index) => {
        const done = effectiveIndex > index || status === BOOKING_STATUS.TRIP_COMPLETED;
        const active = effectiveIndex === index && status !== BOOKING_STATUS.TRIP_COMPLETED;
        const markerColor = done ? colors.success : active ? colors.primary : colors.border;

        return (
          <View key={step.status} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: markerColor,
                }}
              >
                {done ? (
                  <CheckCircle2 size={16} color="white" />
                ) : active ? (
                  <Clock3 size={15} color="white" />
                ) : (
                  <Circle size={13} color={colors.textTertiary} />
                )}
              </View>
              {index < ACTIVE_STEPS.length - 1 && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: compact ? 20 : 32,
                    backgroundColor: done ? colors.success : colors.border,
                    marginTop: spacing.xs,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: index < ACTIVE_STEPS.length - 1 ? spacing.sm : 0 }}>
              <Text style={{ color: active ? colors.primary : colors.text, fontWeight: active ? '900' : '800' }}>
                {step.title}
              </Text>
              {!compact && (
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs }}>
                  {step.description}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
