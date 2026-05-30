import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  /** Optional content for the left slot (e.g. a back button). */
  left?: React.ReactNode;
  /** Optional content for the right slot. */
  right?: React.ReactNode;
};

/**
 * Top-level screen header with a centered title, matching the Settings layout.
 * The two flex side slots keep the title optically centered regardless of their
 * contents.
 */
export function ScreenHeader({ title, left, right }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[styles.header, { borderBottomColor: theme.backgroundElement }]}
    >
      <View style={styles.side}>{left}</View>
      <ThemedText type="default" style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { flex: 1 },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
