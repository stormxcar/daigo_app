import React, { useEffect } from "react";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { apiClient } from "@/services/api";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { AppToast } from "@/components/AppToast";

export default function RootLayout() {
  useEffect(() => {
    let mounted = true;

    apiClient.getCurrentUser().then(async (user) => {
      if (!mounted || !user) return;
      const { data } = await supabase.auth.getSession();
      useAuthStore.getState().restoreSession(user, data.session?.access_token ?? "");
    }).catch(() => undefined);

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        return;
      }

      const user = await apiClient.getCurrentUser();
      if (user) {
        useAuthStore.getState().restoreSession(user, session.access_token);
      }
    });

    const handleUrl = async (url: string) => {
      const parsed = Linking.parse(url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      if (!code) return;

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return;

      const user = await apiClient.getCurrentUser();
      const { data } = await supabase.auth.getSession();
      if (user && data.session) {
        useAuthStore.getState().restoreSession(user, data.session.access_token);
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
        </Stack>
        <AppToast />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
