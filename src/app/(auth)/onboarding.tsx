import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Screen } from '@/components/ScreenComponents';
import { DAIGO_LOGO_URL } from '@/constants/branding';

interface OnboardingStep {
  title: string;
  description: string;
  detail: string;
  highlight: string;
  imageUrl: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Đặt xe nhanh chóng',
    description: 'Chọn điểm đón, điểm đến và xe phù hợp chỉ trong vài thao tác.',
    detail: 'Daigo kết nối bạn với tài xế thật, lộ trình rõ ràng và giá được ước tính trước khi xác nhận.',
    highlight: 'Nhanh chóng',
    imageUrl: 'https://res.cloudinary.com/dzwjgfd7t/image/upload/v1781662332/booking_daigo/58a9b0ce100a4530de574e476e553e61_tmm988.jpg',
  },
  {
    title: 'Lịch trình linh hoạt',
    description: 'Đặt chuyến theo ngày, giờ, số người và nhu cầu di chuyển của bạn.',
    detail: 'Lưu địa điểm hay đi, theo dõi trạng thái chuyến và trò chuyện với tài xế trong app.',
    highlight: 'Linh hoạt',
    imageUrl: 'https://res.cloudinary.com/dzwjgfd7t/image/upload/v1781662243/booking_daigo/a9e9c1c1d6a5af6035b73dbbf64a6b3b_pujrqn.jpg',
  },
  {
    title: 'Tài xế chuyên nghiệp',
    description: 'Tài xế có hồ sơ, xe, đánh giá và lịch sử chuyến đi minh bạch.',
    detail: 'Bạn có thể xem thông tin xe, ảnh xe, trạng thái chuyến và đánh giá sau khi hoàn thành.',
    highlight: 'An toàn',
    imageUrl: 'https://res.cloudinary.com/dzwjgfd7t/image/upload/v1781662206/booking_daigo/224c8d77a5116673ec95e9cc0e395451_gvnun4.jpg',
  },
];

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingStep>>(null);
  const [step, setStep] = useState(0);

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
      return;
    }
    router.push('/(auth)/login');
  };

  return (
    <Screen padding={false} safeArea={false}>
      <View style={{ flex: 1, backgroundColor: '#020617' }}>
        <FlatList
          ref={listRef}
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
            <ImageBackground
              source={{ uri: item.imageUrl }}
              resizeMode="cover"
              style={{ width, height }}
            >
              <View style={styles.imageShade} />
              <LinearGradient
                colors={['rgba(2,6,23,0)', 'rgba(2,6,23,0.52)', 'rgba(2,6,23,0.94)']}
                locations={[0.05, 0.30, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
                <Image source={{ uri: DAIGO_LOGO_URL }} style={styles.logo} />
              </View> */}

              <View style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.highlight.toUpperCase()}</Text>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.detail}>{item.detail}</Text>

                <View style={styles.dots}>
                  {steps.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          width: index === step ? 30 : 8,
                          backgroundColor: index === step ? 'white' : 'rgba(255,255,255,0.42)',
                        },
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity onPress={goNext} activeOpacity={0.88} style={styles.ctaButton}>
                  <Text style={styles.ctaText}>
                    {step < steps.length - 1 ? 'Tiếp theo' : 'Bắt đầu ngay'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.replace('/(customer)/home')}
                  activeOpacity={0.75}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipText}>Bỏ qua</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  logo: {
    width: 132,
    height: 52,
    resizeMode: 'contain',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    marginBottom: spacing.md,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  detail: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  ctaText: {
    color: '#0f172a',
    fontSize: fontSize.base,
    fontWeight: '900',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
