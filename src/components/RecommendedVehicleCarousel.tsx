import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { fontForWeight, spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Vehicle } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Car } from 'lucide-react-native';
import { buildOptimizedCloudinaryImageUrl } from '@/services/videoOptimizationService';

export const RecommendedVehicleCarousel: React.FC<{
  vehicles: Vehicle[];
  onVehiclePress?: (vehicle: Vehicle) => void;
}> = ({ vehicles, onVehiclePress }) => {
  const { colors } = useTheme();
  if (vehicles.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl , paddingHorizontal: spacing.md}}>
      <Text style={{ fontSize: fontSize.base, ...fontForWeight('800'), color: colors.text, marginBottom: spacing.md }}>
        Gợi ý xe
      </Text>
      <FlatList
        data={vehicles}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={7}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onVehiclePress?.(item)}>
            <View
              style={{
                width: 172,
                padding: spacing.md,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
            {item.image?.startsWith('http') ? (
              <Image
                source={{ uri: buildOptimizedCloudinaryImageUrl(item.image, { width: 420 }) }}
                style={{ width: '100%', height: 80, borderRadius: borderRadius.sm, marginBottom: spacing.xs }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ marginBottom: spacing.xs }}>
                <IllustrationBlock height={80} tone="primary" icon={<Car size={20} color="white" />} />
              </View>
            )}
            <Text style={{ fontSize: fontSize.sm, ...fontForWeight('600'), color: colors.text }}>{item.name}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
              {item.pricePerKm.toLocaleString('vi-VN')}đ/km
            </Text>
            <Text numberOfLines={1} style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
              {item.licensePlate} - {item.seats} chỗ
            </Text>
          </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
