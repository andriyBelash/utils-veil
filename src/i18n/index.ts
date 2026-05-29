import { de } from './locales/de';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { pl } from './locales/pl';
import { uk } from './locales/uk';

export type LocaleCode = 'en' | 'uk' | 'pl' | 'de' | 'fr' | 'es';
export type Translations = typeof en;

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  uk: 'Українська',
  pl: 'Polski',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

export const translations: Record<LocaleCode, Translations> = {
  en,
  uk,
  pl,
  de,
  fr,
  es,
};
