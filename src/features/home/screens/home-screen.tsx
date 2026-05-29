import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLocale } from "@/features/localization";
import type { VaultEntry } from "@/features/vault";
import { deleteEntry, EntryRow, useVaultEntries } from "@/features/vault";
import { useTheme } from "@/hooks/use-theme";

const LOGO_LIGHT = require("@/assets/images/logo/logo-light.svg");
const LOGO_DARK = require("@/assets/images/logo/logo-dark.png");

export function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const { entries, loading, reload } = useVaultEntries();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.service.toLowerCase().includes(q) ||
        e.login.toLowerCase().includes(q),
    );
  }, [entries, query]);

  function handleEntryPress(entry: VaultEntry) {
    if (selectionMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        return next;
      });
    } else {
      router.push(`/entry/${entry.id}`);
    }
  }

  function handleLongPress(entry: VaultEntry) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
  }

  function handleCancelSelection() {
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    const count = selectedIds.size;
    Alert.alert(
      t.home.deleteSelectedTitle.replace("{n}", String(count)),
      t.editEntry.deleteMessage,
      [
        { text: t.editEntry.deleteCancel, style: "cancel" },
        {
          text: t.editEntry.deleteConfirm,
          style: "destructive",
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteEntry(id);
            }
            setSelectedIds(new Set());
            reload();
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.backgroundElement },
          ]}
        >
          {selectionMode ? (
            <>
              <ThemedText type="smallBold" style={styles.selectionCount}>
                {t.home.selectedCount.replace("{n}", String(selectedIds.size))}
              </ThemedText>
            </>
          ) : (
            <>
              <View style={styles.brand}>
                <Image
                  source={colorScheme === "dark" ? LOGO_LIGHT : LOGO_DARK}
                  style={styles.logo}
                  contentFit="contain"
                />
                <ThemedText type="smallBold">PassVault</ThemedText>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push("/settings")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { borderColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "gearshape",
                      android: "settings",
                      web: "settings",
                    }}
                    size={18}
                    tintColor={theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push("/create-entry")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: theme.backgroundElement,
                      backgroundColor: theme.text,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: "plus", android: "add", web: "add" }}
                    size={18}
                    tintColor={theme.backgroundSelected}
                  />
                </Pressable>
              </View>
            </>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.center}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={{
                  ios: "lock.shield",
                  android: "security",
                  web: "security",
                }}
                size={32}
                tintColor={theme.textSecondary}
              />
            </View>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              {t.home.emptyTitle}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptySubtitle}
            >
              {t.home.emptySubtitle}
            </ThemedText>
          </View>
        ) : (
          <>
            {!selectionMode && (
              <View style={styles.searchWrap}>
                <View
                  style={[
                    styles.searchBar,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "magnifyingglass",
                      android: "search",
                      web: "search",
                    }}
                    size={16}
                    tintColor={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={t.home.searchPlaceholder}
                    placeholderTextColor={theme.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                  />
                  {query.length > 0 && Platform.OS !== "ios" && (
                    <Pressable onPress={() => setQuery("")} hitSlop={8}>
                      <SymbolView
                        name={{
                          ios: "xmark.circle.fill",
                          android: "cancel",
                          web: "cancel",
                        }}
                        size={16}
                        tintColor={theme.textSecondary}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[
                styles.listContent,
                selectionMode && {
                  paddingBottom: 80 + insets.bottom,
                  paddingTop: 36,
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              renderItem={({ item, index }) => (
                <EntryRow
                  entry={item}
                  onPress={handleEntryPress}
                  onLongPress={handleLongPress}
                  isFirst={index === 0}
                  isLast={index === filtered.length - 1}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(item.id)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.noResults}>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.noResultsText}
                  >
                    {t.home.noResults.replace("{q}", query.trim())}
                  </ThemedText>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>

      {selectionMode && (
        <View
          style={[
            styles.actionBar,
            {
              paddingBottom: insets.bottom + Spacing.three,
              borderTopColor: theme.backgroundElement,
              backgroundColor: theme.background,
            },
          ]}
        >
          <Pressable
            onPress={handleCancelSelection}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.cancelBtn,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold">{t.editEntry.deleteCancel}</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDeleteSelected}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.deleteBtn,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.deleteBtnText}>
              {t.home.deleteSelected.replace("{n}", String(selectedIds.size))}
            </ThemedText>
          </Pressable>
        </View>
      )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  logo: {
    width: 36,
    height: 36,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
  searchWrap: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Platform.OS === "ios" ? 9 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    padding: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  noResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.six,
  },
  noResultsText: {
    textAlign: "center",
    fontSize: 14,
  },
  selectionCount: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  deleteBtn: {
    backgroundColor: "#ff3b30",
  },
  deleteBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});
