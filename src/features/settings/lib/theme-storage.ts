import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'theme_preference';

export async function readThemePreference(): Promise<ThemePreference> {
  try {
    const value =
      Platform.OS === 'web'
        ? localStorage.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {}
  return 'system';
}

export async function writeThemePreference(value: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, value);
    } else {
      await SecureStore.setItemAsync(KEY, value);
    }
  } catch {}
}
