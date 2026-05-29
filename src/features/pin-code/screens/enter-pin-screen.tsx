import { Image } from "expo-image";
import * as LocalAuthentication from "expo-local-authentication";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLocale } from "@/features/localization";
import { readBiometricEnabled } from "@/features/settings/lib/biometric-storage";
import { useTheme } from "@/hooks/use-theme";

import { PinDots, PinDotsHandle } from "../components/pin-dots";
import { PinKeypad } from "../components/pin-keypad";
import { usePinContext } from "../hooks/use-pin-context";

const LOGO_LIGHT = require("@/assets/images/adaptive-icon.png");
const LOGO_DARK = require("@/assets/images/adaptive-icon.png");

export function EnterPinScreen() {
  const { unlockPin, unlockWithBiometric, lockedUntil } = usePinContext();
  const { t } = useLocale();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [biometricVisible, setBiometricVisible] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const dotsRef = useRef<PinDotsHandle>(null);
  const didInitBiometric = useRef(false);

  const remainingMs = Math.max(0, lockedUntil - now);
  const isLocked = remainingMs > 0;

  useEffect(() => {
    if (!isLocked) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isLocked]);

  const lockedMessage = (() => {
    if (!isLocked) return null;
    const totalSec = Math.ceil(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const time = m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
    return t.pin.lockedTryIn.replace("{time}", time);
  })();

  const triggerBiometric = useCallback(async () => {
    try {
      await unlockWithBiometric(t.pin.biometricPrompt);
    } catch {
      // prompt failed — PIN keypad stays as fallback
    }
  }, [t, unlockWithBiometric]);

  useEffect(() => {
    if (didInitBiometric.current) return;
    didInitBiometric.current = true;
    (async () => {
      const biometricEnabled = await readBiometricEnabled();
      if (!biometricEnabled) return;

      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !isEnrolled) return;

      setBiometricVisible(true);
      triggerBiometric();
    })();
  }, [triggerBiometric]);

  const attemptUnlock = useCallback(
    async (value: string) => {
      setBusy(true);
      const ok = await unlockPin(value);
      if (!ok) {
        dotsRef.current?.shake();
        setError(t.pin.incorrectPin);
        setTimeout(() => {
          setPin("");
          setError(null);
          setBusy(false);
        }, 700);
      }
    },
    [unlockPin, t.pin.incorrectPin],
  );

  function handleDigit(digit: string) {
    if (busy || isLocked || pin.length >= 6) return;
    if (error) setError(null);
    const next = pin + digit;
    setPin(next);
    if (next.length === 6) attemptUnlock(next);
  }

  function handleDelete() {
    if (busy || isLocked) return;
    if (error) setError(null);
    setPin((p) => p.slice(0, -1));
  }

  const biometricIcon =
    Platform.OS === "ios"
      ? { ios: "faceid", android: "face_recognition", web: "face" }
      : { ios: "touchid", android: "fingerprint", web: "fingerprint" };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <Image
            source={colorScheme === "dark" ? LOGO_LIGHT : LOGO_DARK}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="subtitle">Veil</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.pin.enterSubtitle}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.dotsSection}>
          <PinDots ref={dotsRef} length={pin.length} />
          {(lockedMessage || error) && (
            <ThemedText type="small" style={styles.errorText}>
              {lockedMessage ?? error}
            </ThemedText>
          )}
        </ThemedView>

        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          disabled={busy || isLocked}
        />

        {biometricVisible && (
          <ThemedView style={styles.biometricRow}>
            <Pressable
              onPress={triggerBiometric}
              style={({ pressed }) => [
                styles.biometricButton,
                pressed && styles.biometricButtonPressed,
              ]}
            >
              <SymbolView
                name={biometricIcon as SymbolViewProps["name"]}
                size={28}
                tintColor={theme.text}
              />
            </Pressable>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.two,
  },
  logo: {
    width: 80,
    height: 80,
  },
  dotsSection: {
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  errorText: { color: "#EF4444" },
  biometricRow: {
    alignItems: "center",
    paddingBottom: Spacing.two,
  },
  biometricButton: {
    padding: Spacing.two,
    borderRadius: 12,
  },
  biometricButtonPressed: {
    opacity: 0.5,
  },
});
