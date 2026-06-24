import React, { useEffect, useRef } from "react";
import { Animated, Image, Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { DAIGO_LOGO_URL, APP_TAGLINE_SHORT } from "@/constants/branding";
import { spacing } from "@/theme/tokens";

// Blue gradient: dark royal blue (top) → vivid blue (bottom)
const GRADIENT_COLORS: [string, string, string] = [
  "#0f2d6e",
  "#1d4ed8",
  "#2563eb",
];

export default function SplashScreen() {
  const { isAuthenticated, user } = useAuthStore();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0.6)).current;
  const dotScale2 = useRef(new Animated.Value(0.6)).current;
  const dotScale3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let active = true;
    let dotsAnimation: Animated.CompositeAnimation | null = null;
    let taglineTimer: ReturnType<typeof setTimeout> | undefined;
    let dotsTimer: ReturnType<typeof setTimeout> | undefined;
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline fade in after logo
    taglineTimer = setTimeout(() => {
      if (!active) return;
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 450);

    // Loading dots pulse loop
    const loopDots = () => {
      if (!active) return;
      dotsAnimation = Animated.sequence([
        Animated.spring(dotScale1, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale2, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale3, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.delay(280),
        Animated.parallel([
          Animated.spring(dotScale1, {
            toValue: 0.6,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(dotScale2, {
            toValue: 0.6,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(dotScale3, {
            toValue: 0.6,
            friction: 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(100),
      ]);
      dotsAnimation.start(() => loopDots());
    };
    dotsTimer = setTimeout(loopDots, 800);

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace(
          user?.role === "customer"
            ? "/(customer)/home"
            : "/(driver)/dashboard",
        );
      } else {
        router.replace("/(auth)/onboarding");
      }
    }, 2800);

    return () => {
      active = false;
      clearTimeout(timer);
      if (taglineTimer) clearTimeout(taglineTimer);
      if (dotsTimer) clearTimeout(dotsTimer);
      dotsAnimation?.stop();
    };
  }, [
    dotScale1,
    dotScale2,
    dotScale3,
    isAuthenticated,
    logoOpacity,
    logoScale,
    taglineOpacity,
    user?.role,
  ]);

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Decorative circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />
      <View style={styles.circleCenter} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image source={{ uri: DAIGO_LOGO_URL }} style={styles.logo} />
        <Image
          source={{
            uri: "https://res.cloudinary.com/dzwjgfd7t/image/upload/v1782178208/booking_daigo/logo_text_no_bg-removebg-preview_dsu4n1.png",
          }}
          style={{
            width: 120,
            height: 40,
            resizeMode: "contain",
            marginTop: spacing.md,
          }}
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity, alignItems: "center" }}>
        <Text style={styles.tagline}>{APP_TAGLINE_SHORT}</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        {[dotScale1, dotScale2, dotScale3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ scale: dot }] }]}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circleTopRight: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -100,
  },
  circleBottomLeft: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -60,
    left: -80,
  },
  circleCenter: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: "35%",
    left: -60,
  },
  logoWrapper: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginBottom: 36,
  },
  logo: {
    width: 230,
    height: 115,
    resizeMode: "contain",
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
});
