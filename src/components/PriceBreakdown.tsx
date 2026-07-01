import React from 'react';
import { Text, View } from 'react-native';
import { Banknote, Clock, Moon, Percent, Route } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontSize, spacing } from '@/theme/tokens';
import { calculateBookingPrice, formatCurrency } from '@/utils/helpers';

type PriceBreakdownProps = {
  distance: number;
  pricePerKm: number;
  passengers?: number;
  time?: string;
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
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

export function PriceBreakdown({
  distance,
  pricePerKm,
  passengers = 1,
  time,
  compact = false,
}: PriceBreakdownProps) {
  const { colors } = useTheme();
  const quote = calculateBookingPrice(distance || 1, pricePerKm || 0, passengers, time);

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
        icon={<Banknote size={16} color={colors.textTertiary} />}
        label="Phí chờ"
        value={quote.waitingFee > 0 ? formatCurrency(quote.waitingFee) : 'Chưa phát sinh'}
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
        <Text style={{ color: colors.text, fontWeight: '900' }}>Tạm tính</Text>
        <Text style={{ color: colors.primary, fontSize: compact ? 18 : 22, fontWeight: '900' }}>
          {formatCurrency(quote.totalPrice)}
        </Text>
      </View>
    </View>
  );
}
