import React, { useEffect } from "react";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import { Text, TextInput } from "react-native";
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
import { showError, showSuccess } from "@/utils/toast";

export default function RootLayout() {
  const currentUser = useAuthStore((state) => state.user);
  const { incomingCall, clearIncomingCall } = useIncomingCall(currentUser);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

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

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only clear the session on an explicit sign-out.
      // Ignoring TOKEN_REFRESHED / INITIAL_SESSION null intermediates prevents
      // the app from being kicked back to login during background token refresh.
      if (!session?.user) {
        if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        }
        return;
      }

      const user = await apiClient.getCurrentUser();
      if (user) {
        useAuthStore.getState().restoreSession(user, session.access_token);
        registerPushNotifications(user.id).catch(() => undefined);
      }
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
