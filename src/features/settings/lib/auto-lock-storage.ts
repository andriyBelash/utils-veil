import * as SecureStore from 'expo-secure-store';

const KEY = 'veil_auto_lock_timeout';

export type AutoLockTimeout = 0 | 30 | 60;

export async function readAutoLockTimeout(): Promise<AutoLockTimeout> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw === null) return 60;
    const n = parseInt(raw, 10);
    if (n === 0 || n === 30 || n === 60) return n as AutoLockTimeout;
    return 60;
  } catch {
    return 60;
  }
}

export async function writeAutoLockTimeout(timeout: AutoLockTimeout): Promise<void> {
  await SecureStore.setItemAsync(KEY, String(timeout));
}
