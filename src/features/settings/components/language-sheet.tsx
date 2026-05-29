import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';
import { LOCALE_LABELS, type LocaleCode } from '@/i18n';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const LOCALE_CODES = Object.keys(LOCALE_LABELS) as LocaleCode[];

export function LanguageSheet({ isOpen, onClose }: Props) {
  const theme = useTheme();
  const { t, locale, setLocale } = useLocale();

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <ThemedText style={styles.title}>{t.settings.languageSheetTitle}</ThemedText>
      <View style={styles.list}>
        {LOCALE_CODES.map((code, index) => {
          const selected = locale === code;
          return (
            <View key={code}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />}
              <Pressable
                onPress={() => { setLocale(code); onClose(); }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <ThemedText style={[styles.label, { color: selected ? theme.text : theme.textSecondary }]}>
                  {LOCALE_LABELS[code]}
                </ThemedText>
                {selected && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                    size={16}
                    tintColor={theme.text}
                  />
                )}
              </Pressable>
            </View>
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
  list: {
    paddingHorizontal: Spacing.four,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  label: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.5,
  },
});
