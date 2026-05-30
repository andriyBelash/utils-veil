import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import {
  enableAppSwitcherProtectionAsync,
  usePreventScreenCapture,
} from "expo-screen-capture";
import { useEffect } from "react";
import { Appearance, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LocaleProvider, useLocale } from "@/features/localization";
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
  const { flowState, lock, unlockWithBiometric } = usePinContext();
  const { t } = useLocale();
  useAutoLock({
    lock,
    unlockWithBiometric,
    biometricPrompt: t.pin.biometricPrompt,
  });

  if (flowState === "loading") return null;
  if (flowState === "create") return <CreatePinScreen />;
  if (flowState === "confirm") return <ConfirmPinScreen />;
  if (flowState === "enter") return <EnterPinScreen />;
  if (flowState === "change-verify") return <VerifyCurrentPinScreen />;
  if (flowState === "change-create") return <CreatePinScreen />;
  if (flowState === "change-confirm") return <ConfirmPinScreen />;

  return (
    <Stack screenOptions={{ animation: "none", headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="item/[id]"
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
      <Stack.Screen name="album/[id]" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Android FLAG_SECURE + iOS screen-recording block, app-wide.
  usePreventScreenCapture();

  useEffect(() => {
    // iOS: blur the app-switcher preview so vault contents don't leak there.
    enableAppSwitcherProtectionAsync().catch(() => {});
  }, []);

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
