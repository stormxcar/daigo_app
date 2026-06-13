import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Vehicle } from '@/types';
import { DeviceLocation } from '@/services/deviceLocation';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { MapPinned } from 'lucide-react-native';

// Placeholder map card – replace with real map implementation later
export const NearbyMapCard: React.FC<{
  vehicles: Vehicle[];
  currentLocation?: DeviceLocation | null;
  onPress?: () => void;
}> = ({ vehicles, currentLocation, onPress }) => {
  const { colors } = useTheme();
  const nearestVehicle = vehicles[0];

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={{ marginBottom: spacing.xl }}>
      <Card style={{ padding: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primaryLight }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <View>
          <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text }}>
            Xe gần bạn
          </Text>
          <Text numberOfLines={1} style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
            {currentLocation?.label ?? 'Bật GPS để gợi ý điểm đón chính xác hơn'}
          </Text>
        </View>
        <View style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.primary }}>
          <Text style={{ color: 'white', fontSize: fontSize.xs, fontWeight: '800' }}>
            GPS
          </Text>
        </View>
      </View>
      <IllustrationBlock
        height={150}
        tone="info"
        title="Bản đồ xe gần bạn"
        subtitle="GPS giúp tài xế tìm điểm đón nhanh hơn"
        icon={<MapPinned size={24} color="white" />}
      />
      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20 }}>
        {nearestVehicle
          ? `${nearestVehicle.name} đang ${nearestVehicle.status.toLowerCase()}, ${nearestVehicle.pricePerKm.toLocaleString('vi-VN')}đ/km.`
          : 'Khi có xe sẵn sàng, xe gần nhất sẽ hiển thị ở đây.'}
      </Text>
    </Card>
    </TouchableOpacity>
  );
};
