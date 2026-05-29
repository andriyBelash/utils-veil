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

export function ConfirmPinScreen() {
  const { backToCreate, confirmPin } = usePinContext();
  const { t } = useLocale();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dotsRef = useRef<PinDotsHandle>(null);

  useEffect(() => {
    if (pin.length !== 6) return;
    setBusy(true);
    confirmPin(pin).then((ok) => {
      if (!ok) {
        dotsRef.current?.shake();
        setError(t.pin.pinsDoNotMatch);
        setTimeout(() => {
          setPin('');
          setError(null);
          setBusy(false);
        }, 700);
      }
    });
  }, [pin, confirmPin]);

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
            onPress={backToCreate}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {t.back}
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{t.pin.confirmTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t.pin.confirmSubtitle}
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
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  backButtonPressed: { opacity: 0.5 },
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
