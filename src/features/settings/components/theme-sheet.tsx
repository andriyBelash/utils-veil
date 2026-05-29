import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { useThemePreference } from '../hooks/use-theme-preference';
import type { ThemePreference } from '../lib/theme-storage';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ThemeSheet({ isOpen, onClose }: Props) {
  const theme = useTheme();
  const { t } = useLocale();
  const { preference, setTheme } = useThemePreference();

  const options: { value: ThemePreference; label: string; icon: SymbolViewProps['name'] }[] = [
    { value: 'light', label: t.settings.themeLight, icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' } as any },
    { value: 'dark', label: t.settings.themeDark, icon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' } as any },
    { value: 'system', label: t.settings.themeSystem, icon: { ios: 'iphone', android: 'smartphone', web: 'smartphone' } as any },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <ThemedText style={styles.title}>{t.settings.themeSheetTitle}</ThemedText>
      <View style={styles.options}>
        {options.map(({ value, label, icon }) => {
          const selected = preference === value;
          return (
            <Pressable
              key={value}
              onPress={() => { setTheme(value); onClose(); }}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundSelected },
                selected && { borderColor: theme.text, borderWidth: 2 },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView name={icon} size={28} tintColor={selected ? theme.text : theme.textSecondary} />
              <ThemedText style={[styles.cardLabel, { color: selected ? theme.text : theme.textSecondary }]}>
                {label}
              </ThemedText>
              {selected && (
                <View style={styles.checkWrapper}>
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                    size={16}
                    tintColor={theme.text}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
    fontSize: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  options: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    borderRadius: 14,
    gap: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkWrapper: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  pressed: {
    opacity: 0.5,
  },
});
