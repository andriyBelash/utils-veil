import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { DEFAULT_ALBUM_ID, setAlbumForItems, setFavoriteMany } from '../lib/db';
import { removeMany, saveManyToDevice, shareMany } from '../lib/media-import';
import type { AlbumWithMeta, VaultItem } from '../lib/types';
import { AlbumPickerSheet } from './album-picker-sheet';
import { ThumbCell } from './thumb-cell';

const COLUMNS = 3;

type Props = {
  items: VaultItem[];
  loading: boolean;
  reload: () => Promise<void> | void;
  emptyIcon: SymbolViewProps['name'];
  emptyTitle: string;
  emptySubtitle: string;
  // Query suffix (no leading '?') appended to /item/[id] so the gallery pages
  // through the same set the grid shows. e.g. 'fav=1' or `album=<id>`.
  galleryScope?: string;
  // When set, this grid shows one album → bulk action is "remove from album".
  // When unset, bulk action is "move to album" (needs `albums` + `onCreateAlbum`).
  albumContext?: string | null;
  albums?: AlbumWithMeta[];
  onCreateAlbum?: (name: string) => Promise<string>;
  // Notifies the parent that selection mode toggled (so it can hide its tab bar).
  onSelectionChange?: (active: boolean) => void;
  // Fired after a mutation so a parent tab host can refresh sibling screens.
  onMutated?: () => void;
};

export function PhotoGrid({
  items,
  loading,
  reload,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  galleryScope,
  albumContext,
  albums,
  onCreateAlbum,
  onSelectionChange,
  onMutated,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const cellSize = width / COLUMNS;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectionMode = selectedIds.size > 0;
  useEffect(() => {
    onSelectionChange?.(selectionMode);
  }, [selectionMode, onSelectionChange]);

  // Mirror selection into a ref so the cell press handlers stay referentially
  // stable (cells don't all re-render on every selection change).
  const selectedRef = useRef(selectedIds);
  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);

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
      else
        router.push(
          `/item/${item.id}${galleryScope ? `?${galleryScope}` : ''}`,
        );
    },
    [router, toggleSelect, galleryScope],
  );

  const onLongPressItem = useCallback(
    (item: VaultItem) => toggleSelect(item.id),
    [toggleSelect],
  );

  const selectedItems = useCallback(
    () => items.filter((it) => selectedIds.has(it.id)),
    [items, selectedIds],
  );

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    const picked = selectedItems();
    if (picked.length === 0) return;
    await withBusy(async () => {
      await shareMany(picked);
    });
  }

  async function handleSave() {
    const picked = selectedItems();
    if (picked.length === 0) return;
    await withBusy(async () => {
      const ok = await saveManyToDevice(picked);
      Alert.alert(
        ok ? t.home.savedTitle : t.home.savePermissionTitle,
        ok ? undefined : t.home.savePermissionMessage,
      );
    });
  }

  async function handleFavorite() {
    const picked = selectedItems();
    if (picked.length === 0) return;
    const next = !picked.every((it) => it.isFavorite);
    await withBusy(async () => {
      await setFavoriteMany(
        picked.map((it) => it.id),
        next,
      );
      clearSelection();
      await reload();
      onMutated?.();
    });
  }

  function handleDelete() {
    const picked = selectedItems();
    if (picked.length === 0 || busy) return;
    Alert.alert(t.home.deleteTitle, t.home.deleteMessage, [
      { text: t.home.cancel, style: 'cancel' },
      {
        text: t.home.deleteConfirm,
        style: 'destructive',
        onPress: () =>
          withBusy(async () => {
            await removeMany(picked);
            clearSelection();
            await reload();
            onMutated?.();
          }),
      },
    ]);
  }

  async function handleRemoveFromAlbum() {
    const picked = selectedItems();
    if (picked.length === 0) return;
    await withBusy(async () => {
      // "Remove from album" returns photos to the default album, never NULL.
      await setAlbumForItems(
        picked.map((it) => it.id),
        DEFAULT_ALBUM_ID,
      );
      clearSelection();
      await reload();
      onMutated?.();
    });
  }

  async function moveSelectedToAlbum(albumId: string) {
    const picked = selectedItems();
    setPickerOpen(false);
    if (picked.length === 0) return;
    await withBusy(async () => {
      await setAlbumForItems(
        picked.map((it) => it.id),
        albumId,
      );
      clearSelection();
      await reload();
      onMutated?.();
    });
  }

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
    <View style={styles.flex}>
      {selectionMode && (
        <View
          style={[
            styles.selectionHeader,
            { borderBottomColor: theme.backgroundElement },
          ]}
        >
          <Pressable
            onPress={clearSelection}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
          <ThemedText type="smallBold">
            {selectedIds.size} {t.home.selected}
          </ThemedText>
          <View style={styles.iconButton} />
        </View>
      )}

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
              name={emptyIcon}
              size={32}
              tintColor={theme.textSecondary}
            />
          </View>
          <ThemedText type="smallBold" style={styles.emptyTitle}>
            {emptyTitle}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.emptySubtitle}
          >
            {emptySubtitle}
          </ThemedText>
        </View>
      ) : (
        <FlashList
          data={items}
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

      {selectionMode && (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundElement,
            },
          ]}
        >
          <SafeAreaView edges={['bottom', 'left', 'right']}>
            <View style={styles.actionRow}>
              <BarAction
                icon={{
                  ios: 'square.and.arrow.up',
                  android: 'share',
                  web: 'share',
                }}
                onPress={handleShare}
                disabled={busy}
              />
              <BarAction
                icon={{
                  ios: 'square.and.arrow.down',
                  android: 'download',
                  web: 'download',
                }}
                onPress={handleSave}
                disabled={busy}
              />
              {albumContext ? (
                <BarAction
                  icon={{
                    ios: 'rectangle.stack.badge.minus',
                    android: 'remove',
                    web: 'remove',
                  }}
                  onPress={handleRemoveFromAlbum}
                  disabled={busy}
                />
              ) : albums ? (
                <BarAction
                  icon={{
                    ios: 'rectangle.stack.badge.plus',
                    android: 'add',
                    web: 'add',
                  }}
                  onPress={() => setPickerOpen(true)}
                  disabled={busy}
                />
              ) : null}
              <BarAction
                icon={
                  selectedItems().every((it) => it.isFavorite)
                    ? {
                        ios: 'heart.fill',
                        android: 'favorite',
                        web: 'favorite',
                      }
                    : {
                        ios: 'heart',
                        android: 'favorite_border',
                        web: 'favorite_border',
                      }
                }
                onPress={handleFavorite}
                disabled={busy}
                tint="#ff3b30"
              />
              <BarAction
                icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
                onPress={handleDelete}
                disabled={busy}
                tint="#ff3b30"
              />
            </View>
          </SafeAreaView>
        </View>
      )}

      {albums && onCreateAlbum && (
        <AlbumPickerSheet
          isOpen={pickerOpen}
          albums={albums}
          onPick={moveSelectedToAlbum}
          onCreate={onCreateAlbum}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  );
}

function BarAction({
  icon,
  onPress,
  disabled,
  tint,
}: {
  icon: SymbolViewProps['name'];
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
  flex: { flex: 1 },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.5 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: { textAlign: 'center' },
  emptySubtitle: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
  listPaddedForBar: { paddingBottom: 88 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
  },
  barAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    minWidth: 56,
  },
});
