import { FlashList } from '@shopify/flash-list';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';

import { AlbumPickerSheet } from '../components/album-picker-sheet';
import { ZoomableImage } from '../components/zoomable-image';
import {
  createAlbum,
  getAlbumsWithMeta,
  getAllItems,
  setAlbumForItems,
  setFavorite,
} from '../lib/db';
import { getCachedThumb } from '../lib/media-cache';
import {
  decryptFullToDataUri,
  decryptThumbToDataUri,
  removeItem,
  saveToDevice,
  shareItem,
} from '../lib/media-import';
import type { AlbumWithMeta, VaultItem } from '../lib/types';

function formatStamp(
  ms: number,
  locale: string,
): { date: string; time: string } {
  const d = new Date(ms);
  try {
    return {
      date: d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
      time: d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch {
    return { date: d.toDateString(), time: d.toTimeString().slice(0, 5) };
  }
}

// One swipeable page. Decrypts its own thumb + full image and cleans them up on
// unmount. FlashList only mounts the visible window, so decryption stays lazy.
type PageProps = {
  item: VaultItem;
  width: number;
  dragProgress: SharedValue<number>;
  onDismiss: () => void;
  onZoomChange: (zoomed: boolean) => void;
};

const GalleryPage = memo(function GalleryPage({
  item,
  width,
  dragProgress,
  onDismiss,
  onZoomChange,
}: PageProps) {
  const { height } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);
  // Instant placeholder when the thumb is already in memory (usual case: tapped
  // from the grid); otherwise it's decrypted in the effect below (blur-up).
  const [thumbUri, setThumbUri] = useState<string | null>(
    () => getCachedThumb(item.id) ?? null,
  );

  // Each page is keyed by item id and memo'd, so a mounted page's `item` never
  // changes — this runs once per page to decrypt its thumb + full image.
  useEffect(() => {
    let active = true;
    if (!getCachedThumb(item.id)) {
      decryptThumbToDataUri(item)
        .then((u) => {
          if (active && u) setThumbUri(u);
        })
        .catch(() => {});
    }
    decryptFullToDataUri(item)
      .then((u) => {
        if (active) setUri(u);
      })
      .catch(() => {
        // corrupt/undecryptable — placeholder stays
      });
    return () => {
      active = false;
    };
  }, [item]);

  return (
    <View style={{ width, height }}>
      {uri || thumbUri ? (
        <ZoomableImage
          uri={uri}
          thumbUri={thumbUri}
          onDismiss={onDismiss}
          dragProgress={dragProgress}
          onZoomChange={onZoomChange}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      )}
    </View>
  );
});

export function ItemDetailScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, fav, album } = useLocalSearchParams<{
    id: string;
    fav?: string;
    album?: string;
  }>();

  const [items, setItems] = useState<VaultItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  // Frozen while the current image is zoomed in, so paging doesn't fight pan.
  const [zoomed, setZoomed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [albums, setAlbums] = useState<AlbumWithMeta[]>([]);

  const loadAlbums = useCallback(async () => {
    try {
      setAlbums(await getAlbumsWithMeta());
    } catch {
      // leave the list as-is; the picker still offers "new album"
    }
  }, []);

  // Load the album list lazily when the picker opens (also picks up albums
  // created since the screen mounted), avoiding a setState-on-mount effect.
  const openPicker = useCallback(() => {
    loadAlbums();
    setPickerOpen(true);
  }, [loadAlbums]);

  // 0 → at rest, 1 → fully swiped away. Fades the chrome out as you drag.
  const dragProgress = useSharedValue(0);
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: 1 - dragProgress.value,
  }));

  // Load the gallery set in the same order the grid showed, and start on the
  // tapped item.
  useEffect(() => {
    let active = true;
    (async () => {
      const all = await getAllItems(album);
      const list = fav === '1' ? all.filter((it) => it.isFavorite) : all;
      if (!active) return;
      const start = Math.max(
        0,
        list.findIndex((it) => it.id === id),
      );
      setItems(list);
      setIndex(start);
    })();
    return () => {
      active = false;
    };
  }, [id, fav, album]);

  const current =
    items && items.length > 0 ? items[Math.min(index, items.length - 1)] : null;
  const stamp = current ? formatStamp(current.createdAt, locale) : null;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(next);
    },
    [width],
  );

  async function toggleFavorite() {
    if (!current) return;
    const next = !current.isFavorite;
    setItems((prev) =>
      prev
        ? prev.map((it) =>
            it.id === current.id ? { ...it, isFavorite: next } : it,
          )
        : prev,
    );
    await setFavorite(current.id, next);
  }

  async function moveToAlbum(albumId: string) {
    setPickerOpen(false);
    if (!current) return;
    const moved = current;
    await setAlbumForItems([moved.id], albumId);
    // Reflect the new membership locally so chrome/state stays consistent.
    setItems((prev) =>
      prev
        ? prev.map((it) => (it.id === moved.id ? { ...it, albumId } : it))
        : prev,
    );
  }

  async function createAndMove(name: string): Promise<string> {
    const id = Crypto.randomUUID();
    await createAlbum(id, name);
    await loadAlbums();
    return id;
  }

  async function handleShare() {
    if (!current || busy) return;
    setBusy(true);
    try {
      await shareItem(current);
    } catch {
      // share cancelled or unavailable
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!current || busy) return;
    setBusy(true);
    try {
      const ok = await saveToDevice(current);
      if (!ok) {
        Alert.alert(t.home.savePermissionTitle, t.home.savePermissionMessage);
      } else {
        Alert.alert(t.home.savedTitle);
      }
    } catch {
      // save failed (e.g. corrupt file) — fail silently
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!current) return;
    Alert.alert(t.home.deleteTitle, t.home.deleteMessage, [
      { text: t.home.cancel, style: 'cancel' },
      {
        text: t.home.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          const removed = current;
          await removeItem(removed);
          setItems((prev) => {
            const next = prev
              ? prev.filter((it) => it.id !== removed.id)
              : prev;
            if (!next || next.length === 0) {
              goBack();
              return next;
            }
            setIndex((i) => Math.min(i, next.length - 1));
            return next;
          });
        },
      },
    ]);
  }

  const renderItem = useCallback(
    ({ item }: { item: VaultItem }) => (
      <GalleryPage
        item={item}
        width={width}
        dragProgress={dragProgress}
        onDismiss={goBack}
        onZoomChange={setZoomed}
      />
    ),
    [width, dragProgress, goBack],
  );

  return (
    <View style={styles.container}>
      {/* Horizontal pager: swipe left/right to switch photos, like a gallery */}
      {items && items.length > 0 ? (
        <FlashList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!zoomed}
          initialScrollIndex={index}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      )}

      {/* Chrome floats over the photo and fades out as you swipe to dismiss */}
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Top bar: back · date/time · spacer */}
        <Animated.View
          style={[styles.topBar, chromeStyle]}
          pointerEvents="box-none"
        >
          <CircleButton
            icon={{
              ios: 'chevron.left',
              android: 'arrow_back',
              web: 'arrow_back',
            }}
            onPress={goBack}
          />
          <View style={styles.stamp} pointerEvents="none">
            {stamp ? (
              <>
                <ThemedText style={styles.stampDate}>{stamp.date}</ThemedText>
                <ThemedText style={styles.stampTime}>{stamp.time}</ThemedText>
              </>
            ) : null}
          </View>
          <View style={styles.circle} />
        </Animated.View>

        {/* Bottom toolbar: share · save · favorite · delete */}
        <Animated.View
          style={[styles.toolbar, chromeStyle]}
          pointerEvents="box-none"
        >
          <CircleButton
            icon={{
              ios: 'square.and.arrow.up',
              android: 'share',
              web: 'share',
            }}
            onPress={handleShare}
            disabled={busy}
          />
          <CircleButton
            icon={{
              ios: 'square.and.arrow.down',
              android: 'download',
              web: 'download',
            }}
            onPress={handleSave}
            disabled={busy}
          />
          <CircleButton
            icon={{
              ios: 'rectangle.stack.badge.plus',
              android: 'add',
              web: 'add',
            }}
            onPress={openPicker}
            disabled={!current}
          />
          <CircleButton
            icon={
              current?.isFavorite
                ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                : {
                    ios: 'heart',
                    android: 'favorite_border',
                    web: 'favorite_border',
                  }
            }
            onPress={toggleFavorite}
            tint={current?.isFavorite ? '#ff3b30' : '#ffffff'}
          />
          <CircleButton
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            onPress={confirmDelete}
            tint="#ff3b30"
          />
        </Animated.View>
      </View>

      <AlbumPickerSheet
        isOpen={pickerOpen}
        albums={albums}
        onPick={moveToAlbum}
        onCreate={createAndMove}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

type CircleButtonProps = {
  icon: SymbolViewProps['name'];
  onPress: () => void;
  tint?: string;
  disabled?: boolean;
};

function CircleButton({
  icon,
  onPress,
  tint = '#ffffff',
  disabled,
}: CircleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circle,
        { backgroundColor: 'rgba(120,120,128,0.32)' },
        (pressed || disabled) && styles.circlePressed,
      ]}
    >
      <SymbolView name={icon} size={22} tintColor={tint} />
    </Pressable>
  );
}

const CIRCLE = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  stamp: {
    flex: 1,
    alignItems: 'center',
  },
  stampDate: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  stampTime: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 13,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePressed: { opacity: 0.5 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.three,
  },
});
