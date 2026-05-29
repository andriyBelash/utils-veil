import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SymbolName = { ios: string; android: string; web?: string };

type Props = {
  icon: SymbolName;
  label: string;
  value?: string;
  type?: 'navigate' | 'toggle' | 'info';
  toggleValue?: boolean;
  toggleDisabled?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
};

export function SettingsRow({ icon, label, value, type = 'navigate', toggleValue = false, toggleDisabled = false, onPress, onValueChange }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && type !== 'toggle' && styles.pressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.backgroundSelected }]}>
        <SymbolView name={icon as SymbolViewProps['name']} size={16} tintColor={theme.text} />
      </View>

      <ThemedText style={styles.label}>{label}</ThemedText>

      <View style={styles.right}>
        {type === 'toggle' && (
          <Switch
            value={toggleValue}
            disabled={toggleDisabled}
            trackColor={{ false: theme.backgroundSelected, true: '#208AEF' }}
            thumbColor="#FFFFFF"
            onValueChange={onValueChange}
          />
        )}
        {type !== 'toggle' && value && (
          <ThemedText type="small" themeColor="textSecondary">
            {value}
          </ThemedText>
        )}
        {type === 'navigate' && (
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={12}
            tintColor={theme.textSecondary}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    minHeight: 56,
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
