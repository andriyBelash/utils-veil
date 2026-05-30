import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { DEFAULT_ALBUM_ID } from '../lib/db';
import type { AlbumWithMeta } from '../lib/types';

type Props = {
  isOpen: boolean;
  albums: AlbumWithMeta[];
  onPick: (albumId: string) => void;
  // Creates a new album and returns its id; the picker then assigns to it.
  onCreate: (name: string) => Promise<string>;
  onClose: () => void;
};

/** Sheet for moving selected photos into an album, with inline album creation. */
export function AlbumPickerSheet({
  isOpen,
  albums,
  onPick,
  onCreate,
  onClose,
}: Props) {
  const { t } = useLocale();
  const theme = useTheme();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  function reset() {
    setCreating(false);
    setName('');
  }

  async function submitNew() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await onCreate(trimmed);
    reset();
    onPick(id);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <View style={styles.container}>
        <ThemedText type="smallBold" style={styles.title}>
          {t.albums.moveToAlbum}
        </ThemedText>

        {creating ? (
          <View style={styles.createRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.albums.namePlaceholder}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitNew}
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />
            <Pressable
              onPress={submitNew}
              disabled={!name.trim()}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: theme.primary },
                (pressed || !name.trim()) && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {t.albums.create}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setCreating(true)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                ios: 'plus.circle',
                android: 'add_circle',
                web: 'add_circle',
              }}
              size={20}
              tintColor={theme.primary}
            />
            <ThemedText type="default" style={{ color: theme.primary }}>
              {t.albums.newAlbum}
            </ThemedText>
          </Pressable>
        )}

        {albums
          .filter((album) => album.id !== DEFAULT_ALBUM_ID)
          .map((album) => (
            <Pressable
              key={album.id}
              onPress={() => onPick(album.id)}
              style={({ pressed }) => [
                styles.option,
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
                size={20}
                tintColor={theme.text}
              />
              <ThemedText type="default" style={styles.optionLabel}>
                {album.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {album.count}
              </ThemedText>
            </Pressable>
          ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  optionLabel: {
    flex: 1,
  },
  createRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  createButton: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.5 },
});
