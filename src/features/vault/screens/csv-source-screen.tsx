import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { AuthSheet } from '../components/auth-sheet';
import { parseCsv, buildImportPreview } from '../lib/csv-import';
import type { CsvSource } from '../lib/csv-import';
import { setPendingImport } from '../lib/import-store';
import { getAllEntries } from '../lib/db';

type SourceOption = {
  key: CsvSource;
  label: string;
  hint: string;
};

export function CsvSourceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<CsvSource | null>(null);

  const sources: SourceOption[] = [
    { key: 'chrome', label: 'Google Chrome', hint: t.csvSource.chromeHint },
    { key: 'firefox', label: 'Mozilla Firefox', hint: t.csvSource.firefoxHint },
    { key: 'edge', label: 'Microsoft Edge', hint: t.csvSource.edgeHint },
    { key: 'generic', label: t.csvSource.genericLabel, hint: t.csvSource.genericHint },
  ];

  async function handleSourcePick(source: CsvSource) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/plain', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    setPendingContent(content);
    setPendingSource(source);
    setAuthOpen(true);
  }

  async function handleAuthSuccess(pin: string) {
    setAuthOpen(false);
    if (!pendingContent || !pendingSource) return;

    const parsed = parseCsv(pendingContent, pendingSource);

    if (parsed.length === 0) {
      Alert.alert(t.csvSource.errorTitle, t.csvSource.noEntries);
      setPendingContent(null);
      setPendingSource(null);
      return;
    }

    const existing = await getAllEntries();
    const preview = buildImportPreview(parsed, existing);

    setPendingImport({ entries: preview.toAdd, source: 'csv' });

    setPendingContent(null);
    setPendingSource(null);

    router.replace('/import-preview');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
          >
            <ThemedText type="default" themeColor="textSecondary">
              {t.csvSource.back}
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t.csvSource.title}
          </ThemedText>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t.csvSource.subtitle}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {sources.map((s, i) => (
              <View key={s.key}>
                <Pressable
                  onPress={() => handleSourcePick(s.key)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{s.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{s.hint}</ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'arrow_forward_ios', web: 'chevron_right' }}
                    size={12}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
                {i < sources.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                )}
              </View>
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {t.csvSource.exportHint}
          </ThemedText>
        </View>
      </SafeAreaView>

      <AuthSheet
        isOpen={authOpen}
        title={t.csvSource.authTitle}
        onSuccess={handleAuthSuccess}
        onCancel={() => {
          setAuthOpen(false);
          setPendingContent(null);
          setPendingSource(null);
        }}
      />
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
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
