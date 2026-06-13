import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, spacing, fontSize } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { DAIGO_LOGO_URL, LOTTIE_ONBOARDING } from '@/constants/branding';

interface OnboardingStep {
  title: string;
  description: string;
  detail: string;
  lottieUrl: string;
  highlight: string;
  gradientColors: [string, string];
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingStep>>(null);
  const [step, setStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: 'Đặt xe nhanh chóng',
      description: 'Đặt xe ô tô cao cấp chỉ trong vài giây, không cần chờ đợi',
      detail: 'Chọn điểm đón, điểm đến và xác nhận. Tài xế sẽ liên hệ bạn ngay!',
      lottieUrl: LOTTIE_ONBOARDING[0],
      highlight: 'Nhanh chóng',
      gradientColors: ['#1d4ed8', '#2563eb'],
    },
    {
      title: 'Lịch trình linh hoạt',
      description: 'Đặt xe theo ngày và giờ bạn mong muốn, phục vụ 24/7',
      detail: 'Đặt trước hay đặt ngay đều được. Quản lý chuyến đi dễ dàng từ ứng dụng.',
      lottieUrl: LOTTIE_ONBOARDING[1],
      highlight: 'Linh hoạt',
      gradientColors: ['#1e40af', '#2563eb'],
    },
    {
      title: 'Tài xế chuyên nghiệp',
      description: 'Tài xế được xác thực danh tính, có kinh nghiệm và an toàn',
      detail: 'Trò chuyện trực tiếp với tài xế, theo dõi lộ trình và đánh giá sau chuyến đi.',
      lottieUrl: LOTTIE_ONBOARDING[2],
      highlight: 'An toàn',
      gradientColors: ['#1e3a8a', '#2563eb'],
    },
  ];

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextStep = Math.round(event.nativeEvent.contentOffset.x / width);
    setStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  };

  const goNext = () => {
    if (step < steps.length - 1) {
      listRef.current?.scrollToIndex({ index: step + 1, animated: true });
      setStep(step + 1);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <Screen padding={false} safeArea={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* ─── TOP HEADER: Logo on gradient blue bar ─── */}
        <LinearGradient
          colors={['#0f2d6e', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + spacing.md }]}
        >
          <Image
            source={{ uri: DAIGO_LOGO_URL }}
            style={styles.headerLogo}
          />
        </LinearGradient>

        {/* ─── SLIDES ─── */}
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
            <View style={[styles.slide, { width }]}>
              {/* Lottie Animation */}
              <View style={styles.lottieContainer}>
                <LinearGradient
                  colors={item.gradientColors}
                  style={styles.lottieGradient}
                >
                  <LottieView
                    source={{ uri: item.lottieUrl }}
                    autoPlay
                    loop
                    style={styles.lottie}
                  />
                </LinearGradient>
              </View>

              {/* Highlight badge */}
              <View
                style={[styles.badge, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.badgeText}>
                  {item.highlight.toUpperCase()}
                </Text>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>
                {item.title}
              </Text>

              {/* Description */}
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {item.description}
              </Text>

              {/* Detail info card */}
              <View
                style={[
                  styles.detailCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  💡 {item.detail}
                </Text>
              </View>

              {/* Step dots */}
              <View style={styles.dots}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        width: i === step ? 28 : 8,
                        backgroundColor: i === step ? colors.primary : colors.surfaceAlt,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        />

        {/* ─── BOTTOM BUTTONS ─── */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={0.88}
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.ctaText}>
              {step < steps.length - 1 ? 'Tiếp theo →' : 'Bắt đầu ngay'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(customer)/home')}
            activeOpacity={0.75}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Bỏ qua
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  headerLogo: {
    width: 130,
    height: 50,
    resizeMode: 'contain',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  lottieContainer: {
    marginBottom: spacing.xl,
  },
  lottieGradient: {
    width: 220,
    height: 220,
    borderRadius: borderRadius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  lottie: {
    width: 180,
    height: 180,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
    maxWidth: '88%',
  },
  detailCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    maxWidth: '90%',
  },
  detailText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  ctaButton: {
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  ctaText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  skipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
