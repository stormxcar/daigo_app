import React, { useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Maximize2, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';

type Props = {
  imageUrl?: string;
};

export function PaymentProofViewer({ imageUrl }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  if (!imageUrl) {
    return (
      <View style={{ padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Chưa có ảnh bill chuyển khoản.</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity activeOpacity={0.88} onPress={() => setVisible(true)}>
        <Image
          source={{ uri: imageUrl }}
          resizeMode="cover"
          style={{ width: '100%', height: 260, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt }}
        />
        <View
          style={{
            position: 'absolute',
            right: spacing.md,
            bottom: spacing.md,
            width: 42,
            height: 42,
            borderRadius: borderRadius.full,
            backgroundColor: 'rgba(0,0,0,0.58)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Maximize2 size={18} color="white" />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <Image source={{ uri: imageUrl }} resizeMode="contain" style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{
              position: 'absolute',
              top: spacing.xl,
              right: spacing.lg,
              width: 44,
              height: 44,
              borderRadius: borderRadius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <X size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
