import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Vehicle } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Car } from 'lucide-react-native';

export const RecommendedVehicleCarousel: React.FC<{
  vehicles: Vehicle[];
  onVehiclePress?: (vehicle: Vehicle) => void;
}> = ({ vehicles, onVehiclePress }) => {
  const { colors } = useTheme();
  if (vehicles.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Gợi ý xe
      </Text>
      <FlatList
        data={vehicles}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onVehiclePress?.(item)}>
            <Card style={{ width: 172, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
            {item.image?.startsWith('http') ? (
              <Image
                source={{ uri: item.image }}
                style={{ width: '100%', height: 80, borderRadius: borderRadius.sm, marginBottom: spacing.xs }}
              />
            ) : (
              <View style={{ marginBottom: spacing.xs }}>
                <IllustrationBlock height={80} tone="primary" icon={<Car size={20} color="white" />} />
              </View>
            )}
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text }}>{item.name}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
              {item.pricePerKm.toLocaleString('vi-VN')}đ/km
            </Text>
            <Text numberOfLines={1} style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
              {item.licensePlate} - {item.seats} chỗ
            </Text>
          </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
