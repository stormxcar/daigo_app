import React, { forwardRef, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Phone, Smartphone, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';

type Props = {
  onAgoraCall: () => void;
  onPhoneCall: () => void;
  hasPhone: boolean;
  onCancel: () => void;
};

export const CallOptionsBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ onAgoraCall, onPhoneCall, hasPhone, onCancel }, ref) => {
    const { colors } = useTheme();
    const snapPoints = useMemo(() => ['34%'], []);

    const optionStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={{ padding: spacing.lg, gap: spacing.md }}>
          <TouchableOpacity onPress={onAgoraCall} activeOpacity={0.82} style={optionStyle}>
            <Smartphone size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>Gọi trong ứng dụng</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>Gọi miễn phí bằng Internet</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onPhoneCall}
            disabled={!hasPhone}
            activeOpacity={0.82}
            style={[optionStyle, !hasPhone && { opacity: 0.48 }]}
          >
            <Phone size={22} color={hasPhone ? colors.success : colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>Gọi số điện thoại</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>Có thể phát sinh cước nhà mạng</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.82} style={[optionStyle, { justifyContent: 'center' }]}>
            <X size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontWeight: '900' }}>Hủy</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

CallOptionsBottomSheet.displayName = 'CallOptionsBottomSheet';
