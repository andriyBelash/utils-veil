import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { VaultEntry } from "../lib/types";

const ACCENT_COLORS = [
  "#3c87f7",
  "#34c759",
  "#ff9500",
  "#ff3b30",
  "#af52de",
  "#00c7be",
  "#ff6b35",
  "#5856d6",
];

function accentColor(service: string): string {
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = (hash * 31 + service.charCodeAt(i)) >>> 0;
  }
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

type Props = {
  entry: VaultEntry;
  onPress: (entry: VaultEntry) => void;
  onLongPress: (entry: VaultEntry) => void;
  isFirst: boolean;
  isLast: boolean;
  selectionMode: boolean;
  isSelected: boolean;
};

export function EntryRow({
  entry,
  onPress,
  onLongPress,
  isFirst,
  isLast,
  selectionMode,
  isSelected,
}: Props) {
  const theme = useTheme();
  const color = accentColor(entry.service);

  return (
    <Pressable
      onPress={() => onPress(entry)}
      onLongPress={() => onLongPress(entry)}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
        },
        isFirst && styles.firstRow,
        isLast && styles.lastRow,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />

      <View style={styles.info}>
        <ThemedText numberOfLines={1} style={styles.service}>
          {entry.service}
        </ThemedText>
        <ThemedText
          themeColor="textSecondary"
          numberOfLines={1}
          style={styles.login}
        >
          {entry.login}
        </ThemedText>
      </View>

      {selectionMode ? (
        <SymbolView
          name={
            isSelected
              ? ({
                  ios: "checkmark.circle.fill",
                  android: "check_circle",
                  web: "check_circle",
                } as any)
              : ({
                  ios: "circle",
                  android: "radio_button_unchecked",
                  web: "radio_button_unchecked",
                } as any)
          }
          size={22}
          tintColor={isSelected ? "#3c87f7" : theme.textSecondary}
        />
      ) : (
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "arrow_forward_ios",
            web: "chevron_right",
          }}
          size={14}
          tintColor={theme.textSecondary}
        />
      )}

      {!isLast && (
        <View
          pointerEvents="none"
          style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
        />
      )}
    </Pressable>
  );
}

const DOT_SIZE = 8;
const DIVIDER_INSET = Spacing.three + DOT_SIZE + Spacing.three;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 6,
    gap: Spacing.three,
  },
  firstRow: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  lastRow: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  service: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 21,
  },
  login: {
    fontSize: 13,
    lineHeight: 17,
  },
  divider: {
    position: "absolute",
    left: DIVIDER_INSET,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
