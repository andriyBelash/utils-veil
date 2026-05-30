import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  isOpen: boolean;
  onCreate: (name: string) => Promise<void> | void;
  onClose: () => void;
};

/** Bottom sheet with a single text field to name and create a new album. */
export function CreateAlbumSheet({ isOpen, onCreate, onClose }: Props) {
  const { t } = useLocale();
  const theme = useTheme();
  const [name, setName] = useState('');

  function close() {
    setName('');
    onClose();
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    close();
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={close}>
      <View style={styles.container}>
        <ThemedText type="smallBold" style={styles.title}>
          {t.albums.newAlbum}
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t.albums.namePlaceholder}
          placeholderTextColor={theme.textSecondary}
          autoFocus={isOpen}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={!name.trim()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary },
            (pressed || !name.trim()) && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
            {t.albums.create}
          </ThemedText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  pressed: { opacity: 0.5 },
});
