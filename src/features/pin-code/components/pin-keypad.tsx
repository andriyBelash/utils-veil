import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function PinKeypad({ onDigit, onDelete, disabled }: Props) {
  const theme = useTheme();

  function handleKey(key: string) {
    if (disabled) return;
    if (key === '⌫') onDelete();
    else onDigit(key);
  }

  return (
    <View style={styles.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) =>
            key ? (
              <Pressable
                key={ki}
                onPress={() => handleKey(key)}
                style={({ pressed }) => [
                  styles.key,
                  { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
                ]}
              >
                <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
              </Pressable>
            ) : (
              <View key={ki} style={styles.key} />
            )
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  key: {
    flex: 1,
    height: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
});
