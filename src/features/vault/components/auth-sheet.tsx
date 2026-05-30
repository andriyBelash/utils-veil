import * as LocalAuthentication from 'expo-local-authentication';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PinDots, type PinDotsHandle } from '@/features/pin-code/components/pin-dots';
import { PinKeypad } from '@/features/pin-code/components/pin-keypad';
import { verifyPin } from '@/features/vault/lib/crypto';
import { readBiometricEnabled } from '@/features/settings/lib/biometric-storage';
import { useLocale } from '@/features/localization';

const PIN_LENGTH = 6;

type Props = {
  isOpen: boolean;
  title: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
};

export function AuthSheet({ isOpen, title, onSuccess, onCancel }: Props) {
  const { t } = useLocale();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricPending, setBiometricPending] = useState(true);
  const dotsRef = useRef<PinDotsHandle>(null);

  // Resetting + prompting on open lives inside this callback (not the effect
  // body) so the setState calls aren't flagged as cascading effect renders, and
  // it's declared before the effect that calls it.
  const tryBiometric = useCallback(async () => {
    setPin('');
    setError('');
    setBiometricPending(true);

    const biometricEnabled = await readBiometricEnabled();
    if (!biometricEnabled) {
      setBiometricPending(false);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      setBiometricPending(false);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: title,
      cancelLabel: t.authSheet.cancel,
      disableDeviceFallback: true,
    });

    if (result.success) {
      onSuccess('');
      // keep biometricPending=true while sheet is closing — no PIN keypad flash
    } else {
      setBiometricPending(false);
    }
  }, [title, t.authSheet.cancel, onSuccess]);

  useEffect(() => {
    // Resetting form state + auto-prompting when the sheet opens is the intended
    // sync-with-prop behavior, not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen) tryBiometric();
  }, [isOpen, tryBiometric]);

  async function handleDigit(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      const ok = await verifyPin(next);
      if (ok) {
        setPin('');
        onSuccess(next);
      } else {
        dotsRef.current?.shake();
        setError(t.authSheet.wrongPin);
        setPin('');
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onCancel}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <SymbolView
            name={{ ios: 'lock.shield', android: 'security', web: 'security' }}
            size={28}
            tintColor="#3c87f7"
          />
        </View>

        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>

        {biometricPending ? (
          <View style={styles.biometricWrap}>
            <ActivityIndicator color="#3c87f7" />
            <ThemedText type="small" themeColor="textSecondary">
              {t.authSheet.biometric}
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.dotsWrap}>
              <PinDots ref={dotsRef} length={pin.length} />
            </View>

            {error ? (
              <ThemedText style={styles.error}>{error}</ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                {t.authSheet.hint}
              </ThemedText>
            )}

            <PinKeypad onDigit={handleDigit} onDelete={handleDelete} />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  iconWrap: {
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 16,
  },
  dotsWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  biometricWrap: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
  },
  error: {
    textAlign: 'center',
    color: '#ff3b30',
    fontSize: 13,
  },
});
