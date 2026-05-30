import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useRegisterAddAction } from '@/features/tabs';
import { DEFAULT_ALBUM_ID, type AlbumWithMeta } from '@/features/vault';
import { useTheme } from '@/hooks/use-theme';

import { AlbumCard } from '../components/album-card';
import { CreateAlbumSheet } from '../components/create-album-sheet';
import { useAlbums } from '../hooks/use-albums';
import { createAlbum } from '../lib/album-actions';

const COLUMNS = 2;

type Props = {
  reloadKey?: number;
};

export function AlbumsScreen({ reloadKey }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { width } = useWindowDimensions();
  const { albums, loading, reload } = useAlbums(reloadKey);
  const [createOpen, setCreateOpen] = useState(false);

  // Each cell is half the screen; AlbumCard's internal padding forms the gutters.
  const cardSize = width / COLUMNS;

  // Pin the default album first with its localized name, and only surface it
  // when it actually holds album-less photos.
  const displayAlbums = useMemo(() => {
    const rest = albums.filter((a) => a.id !== DEFAULT_ALBUM_ID);
    const def = albums.find((a) => a.id === DEFAULT_ALBUM_ID);
    return def && def.count > 0
      ? [{ ...def, name: t.albums.noAlbum }, ...rest]
      : rest;
  }, [albums, t.albums.noAlbum]);

  const openAlbum = useCallback(
    (album: AlbumWithMeta) => router.push(`/album/${album.id}`),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AlbumWithMeta }) => (
      <AlbumCard album={item} size={cardSize} onPress={openAlbum} />
    ),
    [cardSize, openAlbum],
  );

  const handleCreate = useCallback(
    async (name: string) => {
      await createAlbum(name);
      await reload();
    },
    [reload],
  );

  const openCreate = useCallback(() => setCreateOpen(true), []);
  useRegisterAddAction(openCreate);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.flex}>
        <ScreenHeader title={t.albums.title} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : displayAlbums.length === 0 ? (
          <View style={styles.center}>
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={({ pressed }) => [
                styles.emptyIcon,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: 'rectangle.stack',
                  android: 'photo_library',
                  web: 'photo_library',
                }}
                size={32}
                tintColor={theme.textSecondary}
              />
            </Pressable>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              {t.albums.emptyTitle}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptySubtitle}
            >
              {t.albums.emptySubtitle}
            </ThemedText>
          </View>
        ) : (
          <FlashList
            data={displayAlbums}
            keyExtractor={(a) => a.id}
            numColumns={COLUMNS}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
          />
        )}

        <CreateAlbumSheet
          isOpen={createOpen}
          onCreate={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.two,
  },
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
  pressed: { opacity: 0.5 },
});
