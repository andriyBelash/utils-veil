import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { getCachedThumb } from '../lib/media-cache';
import { loadThumb } from '../lib/media-import';
import type { VaultItem } from '../lib/types';

type Props = {
  item: VaultItem;
  size: number;
  selected?: boolean;
  onPress: (item: VaultItem) => void;
  onLongPress: (item: VaultItem) => void;
};

function ThumbCellBase({ item, size, selected, onPress, onLongPress }: Props) {
  const theme = useTheme();
  // Synchronous cache hit → instant first paint, no decrypt flash on scroll.
  const [uri, setUri] = useState<string | null>(() => getCachedThumb(item.id) ?? null);

  // FlashList recycles cell instances instead of remounting them: the same
  // component receives a new `item` without the useState initializer re-running.
  // Reset `uri` synchronously when the id changes so a recycled cell never shows
  // the previous photo (tapping would otherwise open something other than what's
  // on screen). Cache hit paints instantly; a miss falls through to the effect.
  const [renderedId, setRenderedId] = useState(item.id);
  if (renderedId !== item.id) {
    setRenderedId(item.id);
    setUri(getCachedThumb(item.id) ?? null);
  }

  useEffect(() => {
    // Cache hit was already applied by the useState initializer.
    if (getCachedThumb(item.id)) return;
    let cancelled = false;
    loadThumb(item, () => cancelled)
      .then((u) => {
        if (!cancelled && u) setUri(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed]}
    >
      <View style={[styles.cell, { backgroundColor: theme.backgroundElement }]}>
        {uri ? (
          // memory-only — decrypted bytes never hit disk
          <Image source={{ uri }} style={styles.image} contentFit="cover" cachePolicy="memory" />
        ) : null}
        {item.isFavorite ? (
          <View style={styles.favorite}>
            <SymbolView
              name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
              size={14}
              tintColor="#ff3b30"
            />
          </View>
        ) : null}
        {selected ? (
          <View style={styles.selectedOverlay}>
            <SymbolView
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              size={22}
              tintColor="#3c87f7"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export const ThumbCell = memo(
  ThumbCellBase,
  (a, b) =>
    a.item.id === b.item.id &&
    a.item.isFavorite === b.item.isFavorite &&
    a.size === b.size &&
    a.selected === b.selected &&
    a.onPress === b.onPress &&
    a.onLongPress === b.onLongPress,
);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    margin: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
  favorite: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(60,135,247,0.25)',
    alignItems: 'flex-end',
    padding: 4,
  },
});
