import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';

import { PinDots, PinDotsHandle } from '../components/pin-dots';
import { PinKeypad } from '../components/pin-keypad';
import { usePinContext } from '../hooks/use-pin-context';

export function VerifyCurrentPinScreen() {
  const { verifyCurrentPin, beginChangePinCreate, cancelChangePin } = usePinContext();
  const { t } = useLocale();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dotsRef = useRef<PinDotsHandle>(null);

  useEffect(() => {
    if (pin.length !== 6) return;
    setBusy(true);
    verifyCurrentPin(pin).then((ok) => {
      if (ok) {
        setTimeout(() => beginChangePinCreate(), 200);
      } else {
        dotsRef.current?.shake();
        setError(t.pin.incorrectPin);
        setTimeout(() => {
          setPin('');
          setError(null);
          setBusy(false);
        }, 700);
      }
    });
  }, [pin, verifyCurrentPin, beginChangePinCreate]);

  function handleDigit(digit: string) {
    if (busy) return;
    if (error) setError(null);
    setPin((p) => (p.length < 6 ? p + digit : p));
  }

  function handleDelete() {
    if (busy) return;
    if (error) setError(null);
    setPin((p) => p.slice(0, -1));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.topBar}>
          <Pressable
            onPress={cancelChangePin}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t.pin.cancel}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{t.settings.changePin}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t.pin.changeVerifySubtitle}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.dotsSection}>
          <PinDots ref={dotsRef} length={pin.length} />
          {error && <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>}
        </ThemedView>

        <PinKeypad onDigit={handleDigit} onDelete={handleDelete} disabled={busy} />
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
  topBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  cancelButtonPressed: { opacity: 0.5 },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  subtitle: { textAlign: 'center' },
  dotsSection: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  errorText: { color: '#EF4444' },
});
