import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { Appearance, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LocaleProvider } from "@/features/localization";
import {
  ConfirmPinScreen,
  CreatePinScreen,
  EnterPinScreen,
  PinProvider,
  VerifyCurrentPinScreen,
  usePinContext,
} from "@/features/pin-code";
import { readThemePreference } from "@/features/settings/lib/theme-storage";
import { useAutoLock } from "@/hooks/use-auto-lock";

function AppContent() {
  const { flowState, lock } = usePinContext();
  useAutoLock(lock);

  if (flowState === "loading") return null;
  if (flowState === "create") return <CreatePinScreen />;
  if (flowState === "confirm") return <ConfirmPinScreen />;
  if (flowState === "enter") return <EnterPinScreen />;
  if (flowState === "change-verify") return <VerifyCurrentPinScreen />;
  if (flowState === "change-create") return <CreatePinScreen />;
  if (flowState === "change-confirm") return <ConfirmPinScreen />;

  return (
    <Stack screenOptions={{ animation: "none", headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    readThemePreference().then((pref) => {
      if (pref === "light") Appearance.setColorScheme("light");
      else if (pref === "dark") Appearance.setColorScheme("dark");
      else Appearance.setColorScheme("unspecified" as any);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <LocaleProvider>
          <PinProvider>
            <AppContent />
          </PinProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
