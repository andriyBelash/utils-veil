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
import { buildImportPreview, parseCsv } from '../lib/csv-import';
import { getAllEntries } from '../lib/db';
import { setPendingImport } from '../lib/import-store';

export function ImportOptionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<'backup' | 'csv' | null>(null);

  async function handleBackupPick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/plain', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    setPendingContent(content);
    setPendingMode('backup');
    setAuthOpen(true);
  }

  async function handleCsvFlow() {
    router.push('/csv-source');
  }

  async function handleAuthSuccess(_pin: string) {
    setAuthOpen(false);
    // Wait for sheet dismiss animation before navigating
    await new Promise((r) => setTimeout(r, 350));

    if (!pendingContent) return;

    const parsed = parseCsv(pendingContent, 'generic');
    setPendingContent(null);
    setPendingMode(null);

    if (parsed.length === 0) {
      Alert.alert(t.importOptions.errorTitle, t.importOptions.noEntries);
      return;
    }

    const existing = await getAllEntries();
    const preview = buildImportPreview(parsed, existing);
    setPendingImport({ entries: preview.toAdd, source: 'backup' });

    router.push('/import-preview');
  }

  const options = [
    {
      key: 'backup' as const,
      icon: { ios: 'doc.badge.arrow.down', android: 'file_download', web: 'file_download' },
      label: t.importOptions.backupLabel,
      description: t.importOptions.backupDescription,
      onPress: handleBackupPick,
    },
    {
      key: 'csv' as const,
      icon: { ios: 'tablecells', android: 'table_chart', web: 'table_chart' },
      label: t.importOptions.csvLabel,
      description: t.importOptions.csvDescription,
      onPress: handleCsvFlow,
    },
  ];

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
              {t.importOptions.cancel}
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t.importOptions.title}
          </ThemedText>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t.importOptions.subtitle}
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {options.map((opt, i) => (
              <View key={opt.key}>
                <Pressable
                  onPress={opt.onPress}
                  style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#3c87f722' }]}>
                    <SymbolView name={opt.icon as any} size={20} tintColor="#3c87f7" />
                  </View>
                  <View style={styles.optionText}>
                    <ThemedText type="smallBold">{opt.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {opt.description}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'arrow_forward_ios', web: 'chevron_right' }}
                    size={12}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
                {i < options.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>

      <AuthSheet
        isOpen={authOpen}
        title={t.importOptions.authTitle}
        onSuccess={handleAuthSuccess}
        onCancel={() => {
          setAuthOpen(false);
          setPendingContent(null);
          setPendingMode(null);
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44 + Spacing.three + Spacing.three,
  },
});
