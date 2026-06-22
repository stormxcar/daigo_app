import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Car, CheckCircle2, Newspaper, Search, UserCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { Button } from '@/components/BaseComponents';

type Props = {
  visible: boolean;
  onDone: () => void;
  onSkip: () => void;
};

const steps = [
  {
    title: 'Nhập điểm đến ngay từ Trang chủ',
    description: 'Gõ “Bạn muốn đi đâu?” để chọn điểm đến nhanh, sau đó app đưa bạn sang Đặt xe.',
    icon: Search,
  },
  {
    title: 'Tab Đặt xe',
    description: 'Chọn điểm đón, ngày giờ, số khách và xe phù hợp trước khi xác nhận chuyến.',
    icon: Car,
  },
  {
    title: 'Tin tức',
    description: 'Theo dõi bài viết, ảnh, video và cập nhật từ tài xế trong cộng đồng Daigo.',
    icon: Newspaper,
  },
  {
    title: 'Thông báo',
    description: 'Xem cập nhật booking, thanh toán, chat và các thay đổi trạng thái chuyến đi.',
    icon: Bell,
  },
  {
    title: 'Hồ sơ',
    description: 'Quản lý tài khoản, địa điểm đã lưu, lịch sử chuyến đi, cài đặt và đánh giá.',
    icon: UserCircle,
  },
];

export function AppTourGuide({ visible, onDone, onSkip }: Props) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const Icon = step.icon;
  const isLast = index === steps.length - 1;

  const finish = () => {
    setIndex(0);
    onDone();
  };

  const skip = () => {
    setIndex(0);
    onSkip();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.68)',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing.lg,
            ...shadows.xl,
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon size={30} color="#ffffff" />
          </View>

          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: spacing.sm }}>
            {step.title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 24 }}>
            {step.description}
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg }}>
            {steps.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={{
                  height: 8,
                  flex: dotIndex === index ? 1.8 : 1,
                  borderRadius: 4,
                  backgroundColor: dotIndex === index ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={skip}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: borderRadius.lg,
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>Skip</Text>
            </TouchableOpacity>
            <Button
              label={isLast ? 'Done' : 'Next'}
              onPress={() => (isLast ? finish() : setIndex((value) => value + 1))}
              style={{ flex: 1 }}
              icon={isLast ? <CheckCircle2 size={18} color="#ffffff" /> : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
