import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { getItem, setFavorite } from '../lib/db';
import { decryptFullToDataUri, removeItem } from '../lib/media-import';
import type { VaultItem } from '../lib/types';

export function ItemDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<VaultItem | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [favorite, setFavoriteState] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getItem(id);
      if (!active || !loaded) return;
      setItem(loaded);
      setFavoriteState(loaded.isFavorite);
      try {
        const dataUri = await decryptFullToDataUri(loaded);
        if (active) setUri(dataUri);
      } catch {
        // corrupt/undecryptable — leave spinner; user can delete
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function toggleFavorite() {
    if (!item) return;
    const next = !favorite;
    setFavoriteState(next);
    await setFavorite(item.id, next);
  }

  function confirmDelete() {
    if (!item) return;
    Alert.alert(t.home.deleteTitle, t.home.deleteMessage, [
      { text: t.home.cancel, style: 'cancel' },
      {
        text: t.home.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          await removeItem(item);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={toggleFavorite} hitSlop={12} style={styles.headerBtn}>
              <SymbolView
                name={
                  favorite
                    ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                    : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
                }
                size={20}
                tintColor={favorite ? '#ff3b30' : theme.text}
              />
            </Pressable>
            <Pressable onPress={confirmDelete} hitSlop={12} style={styles.headerBtn}>
              <SymbolView
                name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                size={20}
                tintColor="#ff3b30"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.imageWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} contentFit="contain" cachePolicy="memory" />
          ) : (
            <ActivityIndicator color={theme.textSecondary} />
          )}
        </View>

        {item ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.name}>
            {item.originalName}
          </ThemedText>
        ) : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  headerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
