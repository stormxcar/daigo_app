import React from 'react';
import { Text, View } from 'react-native';
import { Banknote, Clock, Moon, Percent, Route } from 'lucide-react-native';
import { PRICE_CONFIG } from '@/constants';
import { useTheme } from '@/theme';
import { fontForWeight, fontSize, spacing } from '@/theme/tokens';
import { calculateBookingPrice, formatCurrency } from '@/utils/helpers';

type PriceBreakdownProps = {
  distance: number;
  pricePerKm: number;
  passengers?: number;
  time?: string;
  waitingMinutes?: number;
  compact?: boolean;
};

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: 7,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        {icon}
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 }}>{label}</Text>
      </View>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, ...fontForWeight('900') }}>{value}</Text>
    </View>
  );
}

export function PriceBreakdown({
  distance,
  pricePerKm,
  passengers = 1,
  time,
  waitingMinutes = 0,
  compact = false,
}: PriceBreakdownProps) {
  const { colors } = useTheme();
  const quote = calculateBookingPrice(distance || 1, pricePerKm || 0, passengers, time, waitingMinutes);

  return (
    <View style={{ gap: compact ? spacing.xs : spacing.sm }}>
      <Row
        icon={<Route size={16} color={colors.primary} />}
        label={`Cước lộ trình (${Number(distance || 1).toFixed(1)} km)`}
        value={formatCurrency(quote.basePrice)}
      />
      <Row
        icon={<Percent size={16} color={colors.info} />}
        label="Phí nền tảng"
        value={formatCurrency(quote.platformFee)}
      />
      <Row
        icon={<Clock size={16} color={quote.peakFee > 0 ? colors.warning : colors.textTertiary} />}
        label="Phụ phí cao điểm"
        value={quote.peakFee > 0 ? formatCurrency(quote.peakFee) : 'Không áp dụng'}
      />
      <Row
        icon={<Moon size={16} color={quote.nightFee > 0 ? colors.warning : colors.textTertiary} />}
        label="Phí đêm"
        value={quote.nightFee > 0 ? formatCurrency(quote.nightFee) : 'Không áp dụng'}
      />
      <Row
        icon={<Banknote size={16} color={quote.waitingFee > 0 ? colors.warning : colors.textTertiary} />}
        label={`Phí chờ${waitingMinutes > 0 ? ` (${quote.billableWaitingMinutes} phút tính phí)` : ''}`}
        value={quote.waitingFee > 0 ? formatCurrency(quote.waitingFee) : `Miễn ${PRICE_CONFIG.WAITING_FREE_MINUTES} phút đầu`}
      />

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          marginTop: compact ? 0 : spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: colors.text, ...fontForWeight('900') }}>Tạm tính</Text>
        <Text style={{ color: colors.primary, fontSize: compact ? 18 : 22, ...fontForWeight('900') }}>
          {formatCurrency(quote.totalPrice)}
        </Text>
      </View>
    </View>
  );
}