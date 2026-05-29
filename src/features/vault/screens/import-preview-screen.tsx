import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { createEntry } from '../lib/db';
import { clearPendingImport, getPendingImport } from '../lib/import-store';

type StatRowProps = {
  icon: { ios: string; android: string; web: string };
  iconColor: string;
  label: string;
  value: string | number;
};

function StatRow({ icon, iconColor, label, value }: StatRowProps) {
  const theme = useTheme();
  return (
    <View style={statStyles.row}>
      <View style={[statStyles.icon, { backgroundColor: iconColor + '22' }]}>
        <SymbolView name={icon as any} size={18} tintColor={iconColor} />
      </View>
      <ThemedText type="small" style={statStyles.label}>{label}</ThemedText>
      <ThemedText type="smallBold">{String(value)}</ThemedText>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.three,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});

export function ImportPreviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const pending = getPendingImport();
  const toAdd = pending?.entries ?? [];
  const total = toAdd.length;

  async function handleConfirm() {
    if (importing || total === 0) return;
    setImporting(true);
    setError('');
    try {
      for (const entry of toAdd) {
        await createEntry(entry);
      }
      clearPendingImport();
      router.dismissAll();
    } catch {
      setError(t.importPreview.error);
      setImporting(false);
    }
  }

  function handleCancel() {
    clearPendingImport();
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable
            onPress={handleCancel}
            hitSlop={12}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
          >
            <ThemedText type="default" themeColor="textSecondary">
              {t.importPreview.cancel}
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t.importPreview.title}
          </ThemedText>
          <View style={styles.headerSide} />
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <StatRow
              icon={{ ios: 'list.bullet', android: 'list', web: 'list' }}
              iconColor="#3c87f7"
              label={t.importPreview.toAdd}
              value={total}
            />
          </View>

          {error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : null}

          {total === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              {t.importPreview.nothingNew}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: theme.backgroundElement,
              paddingBottom: insets.bottom + Spacing.three,
            },
          ]}
        >
          <Pressable
            onPress={handleConfirm}
            disabled={importing || total === 0}
            style={({ pressed }) => [
              styles.confirmBtn,
              (importing || total === 0) && styles.confirmDisabled,
              pressed && styles.pressed,
            ]}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.confirmText}>
                {total === 0 ? t.importPreview.nothingToImport : t.importPreview.confirm.replace('{n}', String(total))}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { flex: 1 },
  headerTitle: { flex: 2, textAlign: 'center' },
  pressed: { opacity: 0.5 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  error: {
    color: '#ff3b30',
    fontSize: 14,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
