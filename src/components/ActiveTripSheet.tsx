import React, { useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Car, ChevronUp, Clock, MapPin, UserRound } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button, Card } from '@/components/BaseComponents';
import { Booking } from '@/types';
import { formatCurrency, formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';

interface ActiveTripSheetProps {
  booking?: Booking | null;
  role: 'customer' | 'driver';
  onOpenDetail: (bookingId: string) => void;
}

export function ActiveTripSheet({ booking, role, onOpenDetail }: ActiveTripSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['42%', '68%'], []);

  if (!booking) return null;

  const statusInfo = getBookingStatusInfo(booking.status);
  const personLabel = role === 'customer' ? booking.driverName : booking.customerName;
  const personPhone = role === 'customer' ? booking.driverPhone : booking.customerPhone;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => sheetRef.current?.present()}
        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}
      >
        <Card style={{ backgroundColor: colors.primary, borderRadius: borderRadius.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: fontSize.base }}>Chuyến đang diễn ra</Text>
              <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.82)', marginTop: 3, fontSize: fontSize.xs }}>
                {statusInfo.label} - {booking.bookingCode ?? 'Booking'}
              </Text>
            </View>
            <ChevronUp size={20} color="white" />
          </View>
        </Card>
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Trạng thái chuyến</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{booking.bookingCode ?? 'Booking'}</Text>
            </View>
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: statusInfo.color }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: fontSize.xs }}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <MapPin size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Điểm đón</Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 3 }}>{booking.pickupLocation}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <MapPin size={18} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Điểm đến</Text>
                <Text style={{ color: colors.text, fontWeight: '800', marginTop: 3 }}>{booking.dropoffLocation}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Clock size={18} color={colors.info} />
              <Text style={{ color: colors.text, flex: 1 }}>
                {formatVietnamDate(booking.date)} - {booking.time}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <UserRound size={18} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>{personLabel || 'Đang cập nhật'}</Text>
                {!!personPhone && <Text style={{ color: colors.textSecondary, marginTop: 3 }}>{personPhone}</Text>}
              </View>
              <Text style={{ color: colors.primary, fontWeight: '900' }}>
                {formatCurrency(booking.actualPrice ?? booking.estimatedPrice ?? 0)}
              </Text>
            </View>
            {!!booking.note && (
              <View style={{ padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.xs }}>Ghi chú</Text>
                <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{booking.note}</Text>
              </View>
            )}
          </View>

          <Button
            label="Mở chi tiết chuyến"
            onPress={() => onOpenDetail(booking.id)}
            style={{ marginTop: spacing.lg }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
