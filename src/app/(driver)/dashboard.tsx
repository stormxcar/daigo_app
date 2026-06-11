import React from 'react';
import { useTheme } from '@/theme';
import { Screen, EmptyState } from '@/components/ScreenComponents';
import { BarChart3 } from 'lucide-react-native';

export default function DriverDashboard() {
  const { colors } = useTheme();

  return (
    <Screen padding>
      <EmptyState
        icon={<BarChart3 size={48} color={colors.primary} />}
        title="Chưa có dữ liệu"
        description="Dữ liệu của bạn sẽ hiển thị ở đây"
      />
    </Screen>
  );
}
