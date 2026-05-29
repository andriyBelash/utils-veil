import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuccessOverlay } from '@/components/success-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { createEntry } from '../lib/db';
import { generatePassword } from '../lib/crypto';

export function CreateEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();

  const [service, setService] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loginRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const canSave = service.trim().length > 0 && login.trim().length > 0 && password.length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      await createEntry({ service: service.trim(), login: login.trim(), password });
      Keyboard.dismiss();
      setSuccess(true);
    } catch {
      setError(t.createEntry.saveError);
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      const generated = await generatePassword();
      setPassword(generated);
      setShowPassword(true);
    } finally {
      setGenerating(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundElement,
      color: theme.text,
      borderColor: theme.backgroundSelected,
    },
  ];

  if (success) {
    return <SuccessOverlay onFinish={() => router.back()} />;
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
              {t.createEntry.cancel}
            </ThemedText>
          </Pressable>

          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t.createEntry.title}
          </ThemedText>

          <View style={[styles.headerSide, styles.headerRight]}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave || saving}
              hitSlop={12}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3c87f7" />
              ) : (
                <ThemedText
                  type="default"
                  style={[styles.saveText, !canSave && styles.saveDisabled]}
                >
                  {t.createEntry.save}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#ff3b3022' }]}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {/* Service */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <SymbolView
                    name={{ ios: 'globe', android: 'language', web: 'language' }}
                    size={13}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                    {t.createEntry.serviceLabel}
                  </ThemedText>
                </View>
                <TextInput
                  style={inputStyle}
                  placeholder={t.createEntry.servicePlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  value={service}
                  onChangeText={setService}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => loginRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

              {/* Login */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <SymbolView
                    name={{ ios: 'person', android: 'person', web: 'person' }}
                    size={13}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                    {t.createEntry.loginLabel}
                  </ThemedText>
                </View>
                <TextInput
                  ref={loginRef}
                  style={inputStyle}
                  placeholder={t.createEntry.loginPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  value={login}
                  onChangeText={setLogin}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

              {/* Password */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <SymbolView
                    name={{ ios: 'lock', android: 'lock', web: 'lock' }}
                    size={13}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                    {t.createEntry.passwordLabel}
                  </ThemedText>
                </View>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    style={[inputStyle, styles.passwordInput]}
                    placeholder={t.createEntry.passwordPlaceholder}
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.eyeBtn,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={
                        showPassword
                          ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                          : { ios: 'eye', android: 'visibility', web: 'visibility' }
                      }
                      size={16}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Generate button */}
            <Pressable
              onPress={handleGenerate}
              disabled={generating}
              style={({ pressed }) => [
                styles.generateBtn,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
                pressed && styles.pressed,
              ]}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#3c87f7" />
              ) : (
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  size={15}
                  tintColor="#3c87f7"
                />
              )}
              <ThemedText type="small" style={styles.generateText}>
                {t.createEntry.generate}
              </ThemedText>
            </Pressable>

            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              {t.createEntry.hint}
            </ThemedText>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
  },
  saveText: {
    color: '#3c87f7',
    fontWeight: '600',
    fontSize: 16,
  },
  saveDisabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.5,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  errorBox: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    lineHeight: 20,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
  },
  generateText: {
    color: '#3c87f7',
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: Spacing.four,
  },
});
