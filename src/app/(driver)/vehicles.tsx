import React from 'react';
import { useTheme } from '@/theme';
import { Screen, EmptyState } from '@/components/ScreenComponents';
import { Car } from 'lucide-react-native';

export default function DriverVehicles() {
  const { colors } = useTheme();

  return (
    <Screen padding>
      <EmptyState
        icon={<Car size={48} color={colors.primary} />}
        title="Chưa có xe"
        description="Thêm xe của bạn để bắt đầu nhận chuyến đi"
      />
    </Screen>
  );
}
