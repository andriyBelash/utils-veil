import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import {
  DEFAULT_ALBUM_ID,
  PhotoGrid,
  getAlbums,
  useVaultItems,
} from '@/features/vault';
import { useTheme } from '@/hooks/use-theme';

import { useAlbums } from '../hooks/use-albums';
import { createAlbum } from '../lib/album-actions';

export function AlbumDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDefault = id === DEFAULT_ALBUM_ID;
  const { items, loading, reload } = useVaultItems(id);
  // The picker (move-to-album) only needs the album list for the default album.
  const { albums } = useAlbums();
  const [title, setTitle] = useState(
    isDefault ? t.albums.noAlbum : t.albums.title,
  );

  useEffect(() => {
    if (isDefault) return;
    let active = true;
    getAlbums()
      .then((albums) => {
        const album = albums.find((item) => item.id === id);
        if (active && album) setTitle(album.name);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, isDefault]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.backgroundElement },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: 'chevron.left',
                android: 'arrow_back',
                web: 'arrow_back',
              }}
              size={16}
              tintColor={theme.text}
            />
          </Pressable>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <View style={styles.backButton} />
        </View>

        <PhotoGrid
          items={items}
          loading={loading}
          reload={reload}
          emptyIcon={{
            ios: 'rectangle.stack',
            android: 'photo_library',
            web: 'photo_library',
          }}
          emptyTitle={t.albums.empty}
          emptySubtitle={t.home.emptySubtitle}
          galleryScope={`album=${id}`}
          // Default album: items can only be moved out (into a real album).
          // Regular album: items can be removed (sent back to the default).
          {...(isDefault
            ? { albums, onCreateAlbum: createAlbum }
            : { albumContext: id })}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  pressed: { opacity: 0.5 },
});
