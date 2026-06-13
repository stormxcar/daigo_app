import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Booking } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Route } from 'lucide-react-native';

export const RecentTripsCarousel: React.FC<{
  trips: Booking[];
  onTripPress?: (booking: Booking) => void;
}> = ({ trips, onTripPress }) => {
  const { colors } = useTheme();
  if (trips.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Lịch sử chuyến đi
      </Text>
      <FlatList
        data={trips}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onTripPress?.(item)}>
            <Card style={{ width: 228, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              {item.vehicle?.image?.startsWith('http') ? (
                <Image
                  source={{ uri: item.vehicle.image }}
                  style={{ width: '100%', height: 80, borderRadius: borderRadius.sm, marginBottom: spacing.xs }}
                />
              ) : (
                <View style={{ marginBottom: spacing.xs }}>
                  <IllustrationBlock height={80} tone="success" icon={<Route size={20} color="white" />} />
                </View>
              )}
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text }}>
                {item.time} - {new Date(item.date).toLocaleDateString('vi-VN')}
              </Text>
              <Text numberOfLines={2} style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                {item.pickupLocation} → {item.dropoffLocation}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
                Giá: {item.estimatedPrice.toLocaleString('vi-VN')}đ
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
