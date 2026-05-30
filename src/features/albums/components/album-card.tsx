import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { decryptThumbToDataUri, type AlbumWithMeta } from '@/features/vault';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  album: AlbumWithMeta;
  // Full cell width (half the screen). Internal padding forms the gutters.
  size: number;
  onPress: (album: AlbumWithMeta) => void;
};

const PAD = Spacing.two;

export function AlbumCard({ album, size, onPress }: Props) {
  const theme = useTheme();
  const { t } = useLocale();
  const [cover, setCover] = useState<string | null>(null);
  const coverSize = size - PAD * 2;

  useEffect(() => {
    let active = true;
    const item = album.coverItem;
    if (!item) {
      setCover(null);
      return;
    }
    // decryptThumbToDataUri is cache-aware, so repeat mounts are cheap.
    decryptThumbToDataUri(item)
      .then((u) => {
        if (active) setCover(u);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [album.coverItem]);

  return (
    <Pressable
      onPress={() => onPress(album)}
      style={({ pressed }) => [styles.cell, { width: size }, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.cover,
          { width: coverSize, height: coverSize, backgroundColor: theme.backgroundElement },
        ]}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.image} contentFit="cover" cachePolicy="memory" />
        ) : (
          <SymbolView
            name={{ ios: 'rectangle.stack', android: 'photo_library', web: 'photo_library' }}
            size={32}
            tintColor={theme.textSecondary}
          />
        )}
      </View>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
        {album.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {album.count} {t.albums.photos}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    paddingHorizontal: PAD,
    marginBottom: Spacing.four,
  },
  cover: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: Spacing.two,
  },
  pressed: { opacity: 0.6 },
});
