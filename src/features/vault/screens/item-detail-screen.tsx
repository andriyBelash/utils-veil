import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';

import { getItem, setFavorite } from '../lib/db';
import { getCachedThumb } from '../lib/media-cache';
import {
  decryptFullToDataUri,
  decryptThumbToDataUri,
  removeItem,
  shareItem,
} from '../lib/media-import';
import type { VaultItem } from '../lib/types';

function formatStamp(ms: number, locale: string): { date: string; time: string } {
  const d = new Date(ms);
  try {
    return {
      date: d.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
      time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { date: d.toDateString(), time: d.toTimeString().slice(0, 5) };
  }
}

export function ItemDetailScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<VaultItem | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  // Low-res preview shown instantly while the full image decrypts (blur-up).
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [favorite, setFavoriteState] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const loaded = await getItem(id);
      if (!active || !loaded) return;
      setItem(loaded);
      setFavoriteState(loaded.isFavorite);
      // Instant placeholder: the thumb is usually already in memory from the
      // grid tap; if not (deep link), decrypt it — it's tiny and fast.
      const cachedThumb = getCachedThumb(loaded.id);
      if (cachedThumb) {
        setThumbUri(cachedThumb);
      } else {
        decryptThumbToDataUri(loaded)
          .then((u) => {
            if (active && u) setThumbUri(u);
          })
          .catch(() => {});
      }
      try {
        const dataUri = await decryptFullToDataUri(loaded);
        if (active) setUri(dataUri);
      } catch {
        // corrupt/undecryptable — placeholder stays; user can still delete
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const stamp = item ? formatStamp(item.createdAt, locale) : null;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function toggleFavorite() {
    if (!item) return;
    const next = !favorite;
    setFavoriteState(next);
    await setFavorite(item.id, next);
  }

  async function handleShare() {
    if (!item || busy) return;
    setBusy(true);
    try {
      await shareItem(item);
    } catch {
      // share cancelled or unavailable
    } finally {
      setBusy(false);
    }
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
          goBack();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
        {/* Top bar: back · date/time · spacer */}
        <View style={styles.topBar}>
          <CircleButton icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} onPress={goBack} />
          <View style={styles.stamp}>
            {stamp ? (
              <>
                <ThemedText style={styles.stampDate}>{stamp.date}</ThemedText>
                <ThemedText style={styles.stampTime}>{stamp.time}</ThemedText>
              </>
            ) : null}
          </View>
          <View style={styles.circle} />
        </View>

        {/* Photo — blurred thumb shows instantly, full image cross-dissolves in */}
        <View style={styles.imageWrap}>
          {uri || thumbUri ? (
            <Image
              source={uri ? { uri } : null}
              placeholder={thumbUri ? { uri: thumbUri } : null}
              placeholderContentFit="contain"
              transition={200}
              style={styles.image}
              contentFit="contain"
              cachePolicy="memory"
            />
          ) : (
            <ActivityIndicator color="#ffffff" />
          )}
        </View>

        {/* Bottom toolbar: share · favorite · delete */}
        <View style={styles.toolbar}>
          <CircleButton
            icon={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
            onPress={handleShare}
            disabled={busy}
          />
          <CircleButton
            icon={
              favorite
                ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
            }
            onPress={toggleFavorite}
            tint={favorite ? '#ff3b30' : '#ffffff'}
          />
          <CircleButton
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            onPress={confirmDelete}
            tint="#ff3b30"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

type CircleButtonProps = {
  icon: SymbolViewProps['name'];
  onPress: () => void;
  tint?: string;
  disabled?: boolean;
};

function CircleButton({ icon, onPress, tint = '#ffffff', disabled }: CircleButtonProps) {
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
  safeArea: { flex: 1 },
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
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: Spacing.six,
    paddingTop: Spacing.three,
  },
});
