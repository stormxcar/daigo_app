import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
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
  );
}
