import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

export function PrivacyPolicyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useLocale();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={14}
              tintColor={theme.text}
            />
            <ThemedText type="default">{t.settings.title}</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="smallBold" style={styles.pageTitle}>
            {t.settings.privacyPolicy}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.updated}>
            {t.privacyPolicy.updated}
          </ThemedText>

          <ThemedText type="small" style={styles.intro}>
            {t.privacyPolicy.intro}
          </ThemedText>

          {t.privacyPolicy.sections.map((s) => (
            <View key={s.title} style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {s.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionBody}>
                {s.body}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.5,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  updated: {
    fontSize: 12,
    marginTop: -Spacing.one,
  },
  intro: {
    lineHeight: 22,
  },
  section: {
    gap: Spacing.one + 2,
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionBody: {
    lineHeight: 20,
    fontSize: 13,
  },
});
