import React, { useEffect } from 'react';
import { Image, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedImage = Animated.createAnimatedComponent(Image);
const MIN_SCALE = 1;
const MAX_SCALE = 4;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

type ZoomableImageProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

export function ZoomableImage({ uri, style }: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartTranslateX = useSharedValue(0);
  const pinchStartTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    pinchStartScale.value = 1;
    pinchStartTranslateX.value = 0;
    pinchStartTranslateY.value = 0;
  }, [pinchStartScale, pinchStartTranslateX, pinchStartTranslateY, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, uri]);

  const reset = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const clampTranslate = () => {
    'worklet';
    const maxX = (containerWidth.value * (scale.value - 1)) / 2;
    const maxY = (containerHeight.value * (scale.value - 1)) / 2;
    translateX.value = clamp(translateX.value, -maxX, maxX);
    translateY.value = clamp(translateY.value, -maxY, maxY);
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      pinchStartScale.value = scale.value;
      pinchStartTranslateX.value = translateX.value;
      pinchStartTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(pinchStartScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      const scaleRatio = nextScale / pinchStartScale.value;
      const focalX = event.focalX - containerWidth.value / 2;
      const focalY = event.focalY - containerHeight.value / 2;

      translateX.value = pinchStartTranslateX.value * scaleRatio + focalX * (1 - scaleRatio);
      translateY.value = pinchStartTranslateY.value * scaleRatio + focalY * (1 - scaleRatio);
      scale.value = nextScale;
      clampTranslate();
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      clampTranslate();
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = (containerWidth.value * (scale.value - 1)) / 2;
      const maxY = (containerHeight.value * (scale.value - 1)) / 2;
      translateX.value = clamp(savedTranslateX.value + event.translationX, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withSpring(2.4);
      savedScale.value = 2.4;
    });

  const composedGesture = Gesture.Simultaneous(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        onLayout={(event) => {
          containerWidth.value = event.nativeEvent.layout.width;
          containerHeight.value = event.nativeEvent.layout.height;
        }}
        style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}
      >
        <AnimatedImage
          source={{ uri }}
          resizeMode="contain"
          style={[{ width: '100%', height: '100%' }, imageStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
}
