import React, { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { AppState, AppStateStatus, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { AppToast } from "@/components/AppToast";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import { registerPushNotifications } from "@/services/pushNotifications";
import {
  cleanupBookingStatusSubscriptions,
  cleanupRealtimeDriverLocationSubscriptions,
} from "@/services/bookingRealtimeService";
import { showError, showSuccess } from "@/utils/toast";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0f172a" }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "900", marginBottom: 10 }}>
        Ứng dụng gặp lỗi
      </Text>
      <Text style={{ color: "#cbd5e1", lineHeight: 21, marginBottom: 18 }}>
        {__DEV__ ? error.message : "Vui lòng thử lại. Nếu lỗi lặp lại, hãy gửi log cho đội phát triển."}
      </Text>
      {__DEV__ && (
        <Text selectable style={{ color: "#94a3b8", fontSize: 12, lineHeight: 17, marginBottom: 18 }}>
          {error.stack}
        </Text>
      )}
      <TouchableOpacity
        onPress={retry}
        style={{ alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: "#2563eb" }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const currentUser = useAuthStore((state) => state.user);
  const { incomingCall, clearIncomingCall } = useIncomingCall(currentUser);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (!__DEV__) return undefined;
    const errorUtils = (globalThis as any).ErrorUtils;
    const originalHandler = errorUtils?.getGlobalHandler?.();
    if (!errorUtils?.setGlobalHandler) return undefined;

    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.error("[DAIGO_FATAL_JS]", {
        isFatal,
        message: error?.message,
        stack: error?.stack,
      });
      originalHandler?.(error, isFatal);
    });

    return () => {
      if (originalHandler) {
        errorUtils.setGlobalHandler(originalHandler);
      }
    };
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    const textComponent = Text as any;
    const inputComponent = TextInput as any;
    const textDefaultProps = textComponent.defaultProps ?? {};
    textComponent.defaultProps = {
      ...textDefaultProps,
      style: [{ fontFamily: "Inter_400Regular" }, textDefaultProps.style],
    };

    const inputDefaultProps = inputComponent.defaultProps ?? {};
    inputComponent.defaultProps = {
      ...inputDefaultProps,
      style: [{ fontFamily: "Inter_400Regular" }, inputDefaultProps.style],
    };
  }, [fontsLoaded]);

  useEffect(() => {
    let mounted = true;

    apiClient.getCurrentUser().then(async (user) => {
      if (!mounted) return;
      if (user) {
        const { data } = await supabase.auth.getSession();
        useAuthStore.getState().restoreSession(user, data.session?.access_token ?? "");
        registerPushNotifications(user.id).catch(() => undefined);
      } else {
        // No active session – mark as checked so layouts can render the login guard
        useAuthStore.setState({ isSessionRestored: true });
      }
    }).catch(() => {
      if (mounted) {
        useAuthStore.setState({ isSessionRestored: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        try {
          // Only clear the session on an explicit sign-out.
          // Ignoring TOKEN_REFRESHED / INITIAL_SESSION null intermediates prevents
          // the app from being kicked back to login during background token refresh.
          if (!session?.user) {
            if (event === 'SIGNED_OUT') {
              // Cleanup all realtime subscriptions to prevent ghost channels
              cleanupBookingStatusSubscriptions();
              cleanupRealtimeDriverLocationSubscriptions();
              useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
            }
            return;
          }

          const user = await apiClient.getCurrentUser();
          if (user) {
            useAuthStore.getState().restoreSession(user, session.access_token);
            registerPushNotifications(user.id).catch(() => undefined);
          }
        } catch (error: any) {
          if (__DEV__) console.warn('Auth state sync failed', error);
          useAuthStore.setState({ isSessionRestored: true, error: error?.message ?? 'Không thể đồng bộ phiên đăng nhập.' });
        }
      })();
    });

    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      const hashParams = new URLSearchParams(url.split("#")[1] ?? "");
      if (!code && !(hashParams.get("access_token") && hashParams.get("refresh_token"))) return;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          showError("Không thể hoàn tất đăng nhập", error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.setSession({
          access_token: hashParams.get("access_token") ?? "",
          refresh_token: hashParams.get("refresh_token") ?? "",
        });
        if (error) {
          showError("Không thể hoàn tất đăng nhập", error.message);
          return;
        }
      }

      const user = await apiClient.getCurrentUser();
      const { data } = await supabase.auth.getSession();
      if (user && data.session) {
        useAuthStore.getState().restoreSession(user, data.session.access_token);
        registerPushNotifications(user.id).catch(() => undefined);
        router.replace(user.role === "customer" ? "/(customer)/home" : "/(driver)/dashboard");
        showSuccess("Đăng nhập thành công", "Bạn đã quay lại ứng dụng Daigo Booking.");
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // ── AppState: refresh session when app comes back to foreground ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      // Came back from background / inactive
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        // Ask Supabase to verify/refresh the current session silently.
        // This prevents token-expired crashes after the OS suspends the app.
        supabase.auth.getSession().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="(auth)" options={{ animation: "none" }} />
          <Stack.Screen name="(customer)" options={{ animation: "none" }} />
          <Stack.Screen name="(driver)" options={{ animation: "none" }} />
          <Stack.Screen name="call" options={{ animation: "slide_from_bottom" }} />
        </Stack>
        <IncomingCallModal call={incomingCall} onClose={clearIncomingCall} />
        <AppToast />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
