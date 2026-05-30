import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLocale } from "@/features/localization";
import {
  pickAndImport,
  removeMany,
  requestLibraryPermission,
  saveManyToDevice,
  setFavoriteMany,
  shareMany,
  ThumbCell,
  useVaultItems,
  type VaultItem,
} from "@/features/vault";
import { useTheme } from "@/hooks/use-theme";

const COLUMNS = 3;

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { items, loading, reload } = useVaultItems();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const selectionMode = selectedIds.size > 0;
  const visibleItems = favoritesOnly
    ? items.filter((it) => it.isFavorite)
    : items;
  // Mirror selection into a ref so the press handlers can stay referentially
  // stable (cells don't all re-render) while still reading the latest state.
  const selectedRef = useRef(selectedIds);
  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);

  const { width } = useWindowDimensions();
  const cellSize = width / COLUMNS;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const onPressItem = useCallback(
    (item: VaultItem) => {
      if (selectedRef.current.size > 0) toggleSelect(item.id);
      else router.push(`/item/${item.id}`);
    },
    [router, toggleSelect],
  );

  const onLongPressItem = useCallback(
    (item: VaultItem) => toggleSelect(item.id),
    [toggleSelect],
  );

  const handleImport = useCallback(async () => {
    const granted = await requestLibraryPermission();
    if (!granted) {
      Alert.alert(t.home.permissionTitle, t.home.permissionMessage);
      return;
    }
    setImporting(true);
    setProgress(null);
    try {
      await pickAndImport((done, total) => setProgress({ done, total }));
      await reload();
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }, [t, reload]);

  const selectedItems = useCallback(
    () => items.filter((it) => selectedIds.has(it.id)),
    [items, selectedIds],
  );

  const handleBulkShare = useCallback(async () => {
    const picked = selectedItems();
    if (picked.length === 0 || busy) return;
    setBusy(true);
    try {
      await shareMany(picked);
    } finally {
      setBusy(false);
    }
  }, [selectedItems, busy]);

  const handleBulkSave = useCallback(async () => {
    const picked = selectedItems();
    if (picked.length === 0 || busy) return;
    setBusy(true);
    try {
      const ok = await saveManyToDevice(picked);
      Alert.alert(
        ok ? t.home.savedTitle : t.home.savePermissionTitle,
        ok ? undefined : t.home.savePermissionMessage,
      );
    } finally {
      setBusy(false);
    }
  }, [selectedItems, busy, t]);

  const handleBulkFavorite = useCallback(async () => {
    const picked = selectedItems();
    if (picked.length === 0 || busy) return;
    // If every selected item is already a favorite, the action un-favorites
    // them all; otherwise it favorites the whole selection.
    const next = !picked.every((it) => it.isFavorite);
    setBusy(true);
    try {
      await setFavoriteMany(
        picked.map((it) => it.id),
        next,
      );
      clearSelection();
      await reload();
    } finally {
      setBusy(false);
    }
  }, [selectedItems, busy, clearSelection, reload]);

  const handleBulkDelete = useCallback(() => {
    const picked = selectedItems();
    if (picked.length === 0 || busy) return;
    Alert.alert(t.home.deleteTitle, t.home.deleteMessage, [
      { text: t.home.cancel, style: "cancel" },
      {
        text: t.home.deleteConfirm,
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await removeMany(picked);
            clearSelection();
            await reload();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [selectedItems, busy, t, clearSelection, reload]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<VaultItem>) => (
      <ThumbCell
        item={item}
        size={cellSize}
        selected={selectedIds.has(item.id)}
        onPress={onPressItem}
        onLongPress={onLongPressItem}
      />
    ),
    [cellSize, selectedIds, onPressItem, onLongPressItem],
  );

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
              <Pressable
                onPress={clearSelection}
                style={({ pressed }) => [
                  styles.iconButton,
                  { borderColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={18}
                  tintColor={theme.text}
                />
              </Pressable>
              <ThemedText type="smallBold">
                {selectedIds.size} {t.home.selected}
              </ThemedText>
              <View style={styles.headerSpacer} />
            </>
          ) : (
            <>
              <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                {favoritesOnly ? t.home.favorites : "Ваше сховище"}
              </ThemedText>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setFavoritesOnly((v) => !v)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: favoritesOnly
                        ? "#ff3b30"
                        : theme.backgroundSelected,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={
                      favoritesOnly
                        ? { ios: "heart.fill", android: "favorite", web: "favorite" }
                        : { ios: "heart", android: "favorite_border", web: "favorite_border" }
                    }
                    size={18}
                    tintColor={favoritesOnly ? "#ff3b30" : theme.text}
                  />
                </Pressable>
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
                  onPress={handleImport}
                  disabled={importing}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      borderColor: theme.textSecondary,
                      backgroundColor: theme.primary,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <SymbolView
                      name={{ ios: "plus", android: "add", web: "add" }}
                      size={18}
                      tintColor={theme.text}
                    />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>

        {progress && progress.total > 0 ? (
          <View
            style={[
              styles.progressBanner,
              { borderBottomColor: theme.backgroundElement },
            ]}
          >
            <View style={styles.progressHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.home.importing}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {progress.done}/{progress.total}
              </ThemedText>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.text,
                    width: `${(progress.done / progress.total) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.center}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={
                  favoritesOnly
                    ? { ios: "heart", android: "favorite_border", web: "favorite_border" }
                    : {
                        ios: "photo.on.rectangle",
                        android: "photo_library",
                        web: "photo_library",
                      }
                }
                size={32}
                tintColor={theme.textSecondary}
              />
            </View>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              {favoritesOnly ? t.home.emptyFavoritesTitle : t.home.emptyTitle}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptySubtitle}
            >
              {favoritesOnly
                ? t.home.emptyFavoritesSubtitle
                : t.home.emptySubtitle}
            </ThemedText>
          </View>
        ) : (
          <FlashList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            showsVerticalScrollIndicator={false}
            extraData={selectedIds}
            contentContainerStyle={
              selectionMode ? styles.listPaddedForBar : undefined
            }
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>

      {selectionMode ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundElement,
            },
          ]}
        >
          <SafeAreaView edges={["bottom", "left", "right"]}>
            <View style={styles.actionRow}>
              <BarAction
                icon={{
                  ios: "square.and.arrow.up",
                  android: "share",
                  web: "share",
                }}
                onPress={handleBulkShare}
                disabled={busy}
              />
              <BarAction
                icon={{
                  ios: "square.and.arrow.down",
                  android: "download",
                  web: "download",
                }}
                onPress={handleBulkSave}
                disabled={busy}
              />
              <BarAction
                icon={
                  selectedItems().every((it) => it.isFavorite)
                    ? { ios: "heart.fill", android: "favorite", web: "favorite" }
                    : { ios: "heart", android: "favorite_border", web: "favorite_border" }
                }
                onPress={handleBulkFavorite}
                disabled={busy}
                tint="#ff3b30"
              />
              <BarAction
                icon={{ ios: "trash", android: "delete", web: "delete" }}
                onPress={handleBulkDelete}
                disabled={busy}
                tint="#ff3b30"
              />
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </ThemedView>
  );
}

function BarAction({
  icon,
  onPress,
  disabled,
  tint,
}: {
  icon: SymbolViewProps["name"];
  onPress: () => void;
  disabled?: boolean;
  tint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.barAction,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <SymbolView name={icon} size={24} tintColor={tint ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
  },
  barAction: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    minWidth: 64,
  },
  listPaddedForBar: {
    paddingBottom: 88,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  pressed: { opacity: 0.5 },
  headerSpacer: { width: 38, height: 38 },
  progressBanner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
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
  emptyTitle: { textAlign: "center" },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  logo: {
    width: 40,
    height: 40,
  },
});
