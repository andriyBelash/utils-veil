import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { type LocaleCode, type Translations, translations } from '@/i18n';

import { readLocalePreference, writeLocalePreference } from '../lib/locale-storage';

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: Translations;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectDeviceLocale(): LocaleCode {
  const locales = getLocales();
  const lang = locales[0]?.languageCode ?? 'en';
  const supported: LocaleCode[] = ['en', 'uk', 'pl', 'de', 'fr', 'es'];
  return supported.includes(lang as LocaleCode) ? (lang as LocaleCode) : 'en';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');

  useEffect(() => {
    readLocalePreference().then((saved) => {
      setLocaleState(saved ?? detectDeviceLocale());
    });
  }, []);

  const setLocale = useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale);
    writeLocalePreference(newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
