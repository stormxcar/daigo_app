import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { CheckCircle2, Circle, Clock3, Flag, Navigation, Search, ShieldCheck } from 'lucide-react-native';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';

type BookingTimelineProps = {
  status: string;
  compact?: boolean;
};

type TimelineStep = {
  status: string;
  statuses: string[];
  title: string;
  description: string;
};

const ACTIVE_STEPS: TimelineStep[] = [
  {
    status: BOOKING_STATUS.CREATED,
    statuses: [BOOKING_STATUS.CREATED],
    title: 'Đã đặt',
    description: 'Yêu cầu chuyến đi đã được ghi nhận trên hệ thống.',
  },
  {
    status: BOOKING_STATUS.SEARCHING_DRIVER,
    statuses: [BOOKING_STATUS.SEARCHING_DRIVER, BOOKING_STATUS.SCHEDULED_PENDING_DRIVER],
    title: 'Tìm tài xế',
    description: 'Hệ thống đang gửi yêu cầu đến tài xế phù hợp.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ACCEPTED,
    statuses: [BOOKING_STATUS.DRIVER_ACCEPTED, BOOKING_STATUS.SCHEDULED_DRIVER_ACCEPTED, BOOKING_STATUS.SCHEDULED_UPCOMING],
    title: 'Tài xế nhận chuyến',
    description: 'Tài xế đã xác nhận và chuẩn bị di chuyển.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ARRIVING,
    statuses: [BOOKING_STATUS.DRIVER_ARRIVING],
    title: 'Đang đến điểm đón',
    description: 'Theo dõi vị trí tài xế trên bản đồ realtime.',
  },
  {
    status: BOOKING_STATUS.DRIVER_ARRIVED,
    statuses: [BOOKING_STATUS.DRIVER_ARRIVED],
    title: 'Đã đến điểm đón',
    description: 'Tài xế đã tới nơi, khách hàng có thể ra xe.',
  },
  {
    status: BOOKING_STATUS.TRIP_STARTED,
    statuses: [BOOKING_STATUS.TRIP_STARTED],
    title: 'Đang di chuyển',
    description: 'Chuyến đi đã bắt đầu theo lộ trình đã chọn.',
  },
  {
    status: BOOKING_STATUS.TRIP_COMPLETED,
    statuses: [BOOKING_STATUS.TRIP_COMPLETED],
    title: 'Hoàn thành',
    description: 'Chuyến đi đã kết thúc và được lưu vào lịch sử.',
  },
];

export function BookingTimeline({ status, compact = false }: BookingTimelineProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const isCancelled = TERMINAL_BOOKING_STATUSES.includes(status as any) && status !== BOOKING_STATUS.TRIP_COMPLETED;
  const currentIndex = ACTIVE_STEPS.findIndex((step) => step.statuses.includes(status as any));
  const effectiveIndex = currentIndex >= 0 ? currentIndex : -1;

  useEffect(() => {
    if (isCancelled || status === BOOKING_STATUS.TRIP_COMPLETED) return undefined;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 950, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isCancelled, pulseAnim, status]);

  if (isCancelled) {
    return (
      <View style={{ padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.error + '55' }}>
        <Text style={{ color: colors.error, ...fontForWeight('900'), fontSize: fontSize.base }}>Chuyến đi đã dừng</Text>
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
        const Icon =
          index === 0
            ? ShieldCheck
            : index === 1
            ? Search
            : index === 2
            ? CheckCircle2
            : index === 3
            ? Navigation
            : index === ACTIVE_STEPS.length - 1
            ? Flag
            : Clock3;
        const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
        const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] });

        return (
          <View key={step.status} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: compact ? 30 : 34, height: compact ? 30 : 34, alignItems: 'center', justifyContent: 'center' }}>
                {active && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      width: compact ? 30 : 34,
                      height: compact ? 30 : 34,
                      borderRadius: 18,
                      backgroundColor: colors.primary,
                      opacity: pulseOpacity,
                      transform: [{ scale: pulseScale }],
                    }}
                  />
                )}
                <View
                  style={{
                    width: compact ? 28 : 32,
                    height: compact ? 28 : 32,
                    borderRadius: compact ? 14 : 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: markerColor,
                    borderWidth: active ? 2 : 0,
                    borderColor: active ? colors.surface : 'transparent',
                  }}
                >
                {done ? (
                  <CheckCircle2 size={16} color="white" />
                ) : active ? (
                  <Icon size={15} color="white" />
                ) : (
                  <Circle size={13} color={colors.textTertiary} />
                )}
                </View>
              </View>
              {index < ACTIVE_STEPS.length - 1 && (
                <View
                  style={{
                    width: 3,
                    flex: 1,
                    minHeight: compact ? 20 : 32,
                    backgroundColor: done ? colors.success : active ? colors.primary + '66' : colors.border,
                    marginTop: spacing.xs,
                    borderRadius: borderRadius.full,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: index < ACTIVE_STEPS.length - 1 ? spacing.sm : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ color: active ? colors.primary : done ? colors.text : colors.textSecondary, ...fontForWeight(active ? '900' : '800')}}>
                  {step.title}
                </Text>
                {active && (
                  <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, backgroundColor: colors.primary + '18' }}>
                    <Text style={{ color: colors.primary, fontSize: 10, ...fontForWeight('900')}}>Đang diễn ra</Text>
                  </View>
                )}
              </View>
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
