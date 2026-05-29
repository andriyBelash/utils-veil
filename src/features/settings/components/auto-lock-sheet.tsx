import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import type { AutoLockTimeout } from '../lib/auto-lock-storage';

type Props = {
  isOpen: boolean;
  current: AutoLockTimeout;
  onSelect: (timeout: AutoLockTimeout) => void;
  onClose: () => void;
};

export function AutoLockSheet({ isOpen, current, onSelect, onClose }: Props) {
  const theme = useTheme();
  const { t } = useLocale();

  const options: { value: AutoLockTimeout; label: string; icon: SymbolViewProps['name'] }[] = [
    {
      value: 30,
      label: t.settings.autoLock30s,
      icon: { ios: 'timer', android: 'timer', web: 'timer' } as any,
    },
    {
      value: 60,
      label: t.settings.autoLock1min,
      icon: { ios: 'clock', android: 'schedule', web: 'schedule' } as any,
    },
    {
      value: 0,
      label: t.settings.autoLockNever,
      icon: { ios: 'lock.open', android: 'lock_open', web: 'lock_open' } as any,
    },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <ThemedText style={styles.title}>{t.settings.autoLock}</ThemedText>
      <View style={styles.options}>
        {options.map(({ value, label, icon }) => {
          const selected = current === value;
          return (
            <Pressable
              key={value}
              onPress={() => { onSelect(value); onClose(); }}
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
    textAlign: 'center',
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
