import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
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
  requestLibraryPermission,
  ThumbCell,
  useVaultItems,
  type VaultItem,
} from "@/features/vault";
import { useTheme } from "@/hooks/use-theme";

const COLUMNS = 3;

const LOGO = require("@/assets/images/adaptive-icon.png");

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { items, loading, reload } = useVaultItems();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] =
    useState<{ done: number; total: number } | null>(null);

  const { width } = useWindowDimensions();
  const cellSize = width / COLUMNS;

  const openItem = useCallback(
    (item: VaultItem) => router.push(`/item/${item.id}`),
    [router],
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<VaultItem>) => (
      <ThumbCell
        item={item}
        size={cellSize}
        onPress={openItem}
        onLongPress={openItem}
      />
    ),
    [cellSize, openItem],
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
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
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
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={{
                  ios: "photo.on.rectangle",
                  android: "photo_library",
                  web: "photo_library",
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
          <FlashList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={COLUMNS}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
