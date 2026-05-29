import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'passvault_biometric_enabled';

export async function readBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const val = await SecureStore.getItemAsync(KEY);
  return val === 'true';
}

export async function writeBiometricEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(KEY, enabled ? 'true' : 'false');
}
