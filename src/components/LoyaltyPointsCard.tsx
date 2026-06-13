import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';

// Placeholder loyalty data – replace with real API later
const loyalty = {
  points: 1240,
  tier: 'Silver', // could be Bronze, Silver, Gold, Platinum
  nextTierPoints: 2000,
};

export const LoyaltyPointsCard: React.FC = () => {
  const { colors } = useTheme();
  const progress = Math.min(1, loyalty.points / loyalty.nextTierPoints);
  return (
    <Card style={{ padding: spacing.md, backgroundColor: colors.surfaceAlt }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm }}>
        Điểm thưởng
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <Text style={{ fontSize: fontSize.lg, fontWeight: '800', color: colors.primary }}>{loyalty.points}</Text>
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.sm }}>
          điểm
        </Text>
      </View>
      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>
        Hạng: {loyalty.tier}
      </Text>
      {/* Simple progress bar */}
      <View
        style={{
          height: 8,
          width: '100%',
          backgroundColor: colors.border,
          borderRadius: borderRadius.sm,
        }}
      >
        <View
          style={{
            height: 8,
            width: `${progress * 100}%`,
            backgroundColor: colors.primary,
            borderRadius: borderRadius.sm,
          }}
        />
      </View>
      <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
        {loyalty.nextTierPoints - loyalty.points} điểm còn lại để lên {loyalty.tier === 'Silver' ? 'Gold' : 'Platinum'}
      </Text>
    </Card>
  );
};
