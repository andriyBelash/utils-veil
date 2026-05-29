import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  footer?: string;
  children: React.ReactNode;
};

export function SettingsSection({ label, footer, children }: Props) {
  const theme = useTheme();
  const childArray = React.Children.toArray(children);

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.group}>
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />
            )}
            {child}
          </React.Fragment>
        ))}
      </ThemedView>
      {footer && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.two,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  footer: {
    paddingHorizontal: Spacing.two,
    lineHeight: 18,
  },
});
