import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { LocaleCode } from '@/i18n';

const KEY = 'locale_preference';

export async function readLocalePreference(): Promise<LocaleCode | null> {
  try {
    const value =
      Platform.OS === 'web'
        ? localStorage.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    if (value === 'en' || value === 'uk' || value === 'pl' || value === 'de' || value === 'fr' || value === 'es') {
      return value;
    }
  } catch {}
  return null;
}

export async function writeLocalePreference(locale: LocaleCode): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, locale);
    } else {
      await SecureStore.setItemAsync(KEY, locale);
    }
  } catch {}
}
