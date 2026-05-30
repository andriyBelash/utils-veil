import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createAlbum, useAlbums } from '@/features/albums';
import { useLocale } from '@/features/localization';
import { useRegisterAddAction, useTabBarVisibility } from '@/features/tabs';
import { PhotoGrid, pickAndImport, requestLibraryPermission, useVaultItems } from '@/features/vault';
import { useTheme } from '@/hooks/use-theme';

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useLocale();
  const { setHidden } = useTabBarVisibility();
  const { items, loading, reload } = useVaultItems();
  const { albums, reload: reloadAlbums } = useAlbums();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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
    setProgress(null);
    try {
      await pickAndImport((done, total) => setProgress({ done, total }));
      await reload();
      await reloadAlbums();
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }, [importing, t, reload, reloadAlbums]);

  useRegisterAddAction(handleImport);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title={t.tabs.allPhotos} />

        {progress && progress.total > 0 ? (
          <View style={[styles.progressBanner, { borderBottomColor: theme.backgroundElement }]}>
            <View style={styles.progressHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.home.importing}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {progress.done}/{progress.total}
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.text, width: `${(progress.done / progress.total) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        <PhotoGrid
          items={items}
          loading={loading}
          reload={reload}
          emptyIcon={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
          emptyTitle={t.home.emptyTitle}
          emptySubtitle={t.home.emptySubtitle}
          albums={albums}
          onCreateAlbum={createAlbum}
          onSelectionChange={setHidden}
          onMutated={refreshRelatedTabs}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  progressBanner: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
