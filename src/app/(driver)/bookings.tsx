import React from 'react';
import { useTheme } from '@/theme';
import { Screen, EmptyState } from '@/components/ScreenComponents';
import { Briefcase } from 'lucide-react-native';

export default function DriverBookings() {
  const { colors } = useTheme();

  return (
    <Screen padding>
      <EmptyState
        icon={<Briefcase size={48} color={colors.primary} />}
        title="Chưa có chuyến đi"
        description="Chuyến đi của bạn sẽ hiển thị ở đây"
      />
    </Screen>
  );
}
