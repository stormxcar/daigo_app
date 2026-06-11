import React, { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { spacing, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { Zap, Calendar, Phone } from 'lucide-react-native';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingStep>>(null);
  const [step, setStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: 'Đặt xe nhanh chóng',
      description: 'Đặt xe VinFast VF7 cao cấp chỉ trong vài giây',
      icon: <Zap size={48} color={colors.primary} />,
    },
    {
      title: 'Chọn thời gian linh hoạt',
      description: 'Đặt xe theo ngày và giờ bạn mong muốn, 24/7',
      icon: <Calendar size={48} color={colors.primary} />,
    },
    {
      title: 'Liên hệ trực tiếp tài xế',
      description: 'Trao đổi với tài xế chuyên nghiệm trước chuyến đi',
      icon: <Phone size={48} color={colors.primary} />,
    },
  ];

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextStep = Math.round(event.nativeEvent.contentOffset.x / width);
    setStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  };

  return (
    <Screen padding={false} safeArea={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Background decoration */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            backgroundColor: colors.primary,
            opacity: 0.05,
          }}
        />

        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={steps}
          keyExtractor={(item) => item.title}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <View
              style={{
                width,
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.xl,
              }}
            >
              <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                {item.icon}
              </View>

              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: spacing.md,
                  textAlign: 'center',
                }}
              >
                {item.title}
              </Text>

              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginBottom: spacing.xl,
                  textAlign: 'center',
                  lineHeight: 24,
                }}
              >
                {item.description}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                }}
              >
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === step ? 32 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        i === step ? colors.primary : colors.surfaceAlt,
                    }}
                  />
                ))}
              </View>
            </View>
          )}
        />

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
          <TouchableOpacity onPress={() => router.replace('/(customer)/home')}>
            <Text
              style={{
                color: colors.primary,
                fontSize: fontSize.sm,
                fontWeight: '600',
                textAlign: 'center',
                paddingVertical: spacing.md,
              }}
            >
              Bỏ qua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
