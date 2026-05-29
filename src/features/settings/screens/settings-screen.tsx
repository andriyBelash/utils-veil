import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { usePinContext } from '@/features/pin-code';
import { useTheme } from '@/hooks/use-theme';
import { LOCALE_LABELS } from '@/i18n';
import { useBiometric } from '../hooks/use-biometric';

import { AutoLockSheet } from '../components/auto-lock-sheet';
import { LanguageSheet } from '../components/language-sheet';
import { SettingsRow } from '../components/settings-row';
import { SettingsSection } from '../components/settings-section';
import { ThemeSheet } from '../components/theme-sheet';
import { useAutoLockPreference } from '../hooks/use-auto-lock-preference';
import { getAppVersion } from '../lib/app-version';
import { useThemePreference } from '../hooks/use-theme-preference';
import type { ThemePreference } from '../lib/theme-storage';

const THEME_LABEL: Record<ThemePreference, keyof ReturnType<typeof useLocale>['t']['settings']> = {
  light: 'themeLight',
  dark: 'themeDark',
  system: 'themeSystem',
};

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [langSheetOpen, setLangSheetOpen] = useState(false);
  const [autoLockSheetOpen, setAutoLockSheetOpen] = useState(false);

  const { preference } = useThemePreference();
  const { timeout: autoLockTimeout, setAutoLock } = useAutoLockPreference();
  const { t, locale } = useLocale();

  const AUTO_LOCK_LABEL: Record<0 | 30 | 60, string> = {
    30: t.settings.autoLock30s,
    60: t.settings.autoLock1min,
    0: t.settings.autoLockNever,
  };
  const { startChangePin } = usePinContext();
  const biometric = useBiometric();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={14}
              tintColor={theme.text}
            />
            <ThemedText type="default">{t.settings.backToVault}</ThemedText>
          </Pressable>

          <ThemedText type="default" style={styles.title}>
            {t.settings.title}
          </ThemedText>

          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection label={t.settings.security}>
            <SettingsRow
              icon={{ ios: 'key', android: 'key', web: 'key' }}
              label={t.settings.changePin}
              value={t.settings.pinDigits}
              type="navigate"
              onPress={startChangePin}
            />
            {Platform.OS === 'ios' && (
              <SettingsRow
                icon={{ ios: 'faceid', android: 'face_recognition', web: 'face' }}
                label={t.settings.faceId}
                type="toggle"
                toggleValue={biometric.enabled}
                toggleDisabled={!biometric.available}
                onValueChange={biometric.toggle}
              />
            )}
            {Platform.OS === 'android' && (
              <SettingsRow
                icon={{ ios: 'touchid', android: 'fingerprint', web: 'fingerprint' }}
                label={t.settings.touchId}
                type="toggle"
                toggleValue={biometric.enabled}
                toggleDisabled={!biometric.available}
                onValueChange={biometric.toggle}
              />
            )}
            <SettingsRow
              icon={{ ios: 'timer', android: 'timer', web: 'timer' }}
              label={t.settings.autoLock}
              value={AUTO_LOCK_LABEL[autoLockTimeout]}
              type="navigate"
              onPress={() => setAutoLockSheetOpen(true)}
            />
          </SettingsSection>

          <SettingsSection label={t.settings.appearance}>
            <SettingsRow
              icon={{ ios: 'moon', android: 'dark_mode', web: 'dark_mode' }}
              label={t.settings.theme}
              value={t.settings[THEME_LABEL[preference]]}
              type="navigate"
              onPress={() => setThemeSheetOpen(true)}
            />
            <SettingsRow
              icon={{ ios: 'character.book.closed', android: 'translate', web: 'translate' }}
              label={t.settings.language}
              value={LOCALE_LABELS[locale]}
              type="navigate"
              onPress={() => setLangSheetOpen(true)}
            />
          </SettingsSection>

          <SettingsSection label={t.settings.about}>
            <SettingsRow
              icon={{ ios: 'info.circle', android: 'info', web: 'info' }}
              label={t.settings.privacyPolicy}
              type="navigate"
              onPress={() => router.push('/privacy-policy' as any)}
            />
            <SettingsRow
              icon={{ ios: 'shield', android: 'security', web: 'security' }}
              label={t.settings.appVersion}
              value={getAppVersion()}
              type="info"
            />
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>

      <ThemeSheet isOpen={themeSheetOpen} onClose={() => setThemeSheetOpen(false)} />
      <LanguageSheet isOpen={langSheetOpen} onClose={() => setLangSheetOpen(false)} />
      <AutoLockSheet
        isOpen={autoLockSheetOpen}
        current={autoLockTimeout}
        onSelect={setAutoLock}
        onClose={() => setAutoLockSheetOpen(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  pressed: {
    opacity: 0.5,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
