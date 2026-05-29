import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  disableBiometricUnlock,
  enableBiometricUnlock,
} from '@/features/vault/lib/crypto';
import { useLocale } from '@/features/localization';

import { readBiometricEnabled, writeBiometricEnabled } from '../lib/biometric-storage';

export function useBiometric() {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    async function init() {
      const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
      const typeOk = (Platform.OS === 'ios' && hasFaceId) || (Platform.OS === 'android' && hasFingerprint);

      const isAvailable = hasHardware && isEnrolled && typeOk;
      setAvailable(isAvailable);

      if (isAvailable) {
        setEnabled(await readBiometricEnabled());
      }
    }

    init();
  }, []);

  async function toggle(value: boolean) {
    try {
      if (value) {
        await enableBiometricUnlock(t.pin.biometricPrompt);
      } else {
        await disableBiometricUnlock();
      }
      await writeBiometricEnabled(value);
      setEnabled(value);
    } catch {
      // User cancelled biometric prompt or no DEK in memory — keep prior state
    }
  }

  return { enabled, available, toggle };
}
