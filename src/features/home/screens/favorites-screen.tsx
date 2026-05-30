import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedView } from '@/components/themed-view';
import { createAlbum, useAlbums } from '@/features/albums';
import { useLocale } from '@/features/localization';
import { useRegisterAddAction, useTabBarVisibility } from '@/features/tabs';
import { PhotoGrid, pickAndImport, requestLibraryPermission, useVaultItems } from '@/features/vault';

export function FavoritesScreen() {
  const { t } = useLocale();
  const { setHidden } = useTabBarVisibility();
  const { items, loading, reload } = useVaultItems();
  const { albums, reload: reloadAlbums } = useAlbums();
  const favorites = useMemo(() => items.filter((item) => item.isFavorite), [items]);
  const [importing, setImporting] = useState(false);

  const refreshRelatedTabs = useCallback(() => {
    reloadAlbums();
  }, [reloadAlbums]);

  const handleImport = useCallback(async () => {
    if (importing) return;
    const granted = await requestLibraryPermission();
    if (!granted) {
      Alert.alert(t.home.permissionTitle, t.home.permissionMessage);
      return;
    }
    setImporting(true);
    try {
      await pickAndImport();
      await reload();
      await reloadAlbums();
    } finally {
      setImporting(false);
    }
  }, [importing, t, reload, reloadAlbums]);

  useRegisterAddAction(handleImport);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScreenHeader title={t.tabs.favorites} />
        <PhotoGrid
          items={favorites}
          loading={loading}
          reload={reload}
          emptyIcon={{ ios: 'heart', android: 'favorite_border', web: 'favorite_border' }}
          emptyTitle={t.home.emptyFavoritesTitle}
          emptySubtitle={t.home.emptyFavoritesSubtitle}
          galleryScope="fav=1"
          albums={albums}
          onCreateAlbum={createAlbum}
          onSelectionChange={setHidden}
          onMutated={refreshRelatedTabs}
        />
      </SafeAreaView>
    </ThemedView>
  );
}
