import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { decryptThumbToDataUri } from '../lib/media-import';
import type { VaultItem } from '../lib/types';

type Props = {
  item: VaultItem;
  size: number;
  selected?: boolean;
  onPress: (item: VaultItem) => void;
  onLongPress: (item: VaultItem) => void;
};

export function ThumbCell({ item, size, selected, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    decryptThumbToDataUri(item)
      .then((u) => {
        if (active) setUri(u);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item]);

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
