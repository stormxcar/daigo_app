import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { LocateFixed } from 'lucide-react-native';
import { Button } from '@/components/BaseComponents';
import { DestinationPlace, DestinationSearchInput } from '@/components/DestinationSearchInput';
import { Screen } from '@/components/ScreenComponents';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';

type Props = {
  description?: string;
  onSelectLocation: (place: DestinationPlace) => void;
  onRetryGps?: () => void;
};

export function LocationAccessFallback({
  description = 'Daigo cần vị trí để gợi ý điểm đón, tìm tài xế gần bạn và tính lộ trình chính xác. Nếu bạn chưa muốn bật GPS, hãy nhập vị trí hiện tại để tiếp tục sử dụng app.',
  onSelectLocation,
  onRetryGps,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  return (
    <Screen scroll padding>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: spacing['3xl'] }}>
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <LocateFixed size={34} color={colors.primary} />
        </View>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: spacing.sm }}>
          Rất tiếc, chúng tôi không thể truy cập vị trí của bạn
        </Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl }}>
          {description}
        </Text>
        <DestinationSearchInput
          value={query}
          onChangeText={setQuery}
          onSelectPlace={(place) => {
            setQuery(place.name || place.address);
            onSelectLocation(place);
          }}
          placeholder="Nhập vị trí hiện tại của bạn"
          title="Nhập vị trí hiện tại"
          helperText="Daigo sẽ dùng vị trí này thay cho GPS để bạn tiếp tục sử dụng app."
          autoFocus
          containerStyle={{ marginBottom: spacing.lg }}
        />
        {onRetryGps && <Button label="Thử cấp quyền GPS lại" onPress={onRetryGps} variant="outline" />}
      </View>
    </Screen>
  );
}
