import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuccessOverlay } from '@/components/success-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { generatePassword } from '../lib/crypto';
import { deleteEntry, getEntryById, updateEntry } from '../lib/db';

export function EditEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [service, setService] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<'login' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loginRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    async function load() {
      try {
        const entry = await getEntryById(Number(id));
        if (!entry) {
          router.back();
          return;
        }
        setService(entry.service);
        setLogin(entry.login);
        setPassword(entry.password);
      } catch {
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const canSave = service.trim().length > 0 && login.trim().length > 0 && password.length > 0;

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateEntry(Number(id), { service: service.trim(), login: login.trim(), password });
      router.back();
    } catch {
      setError(t.editEntry.saveError);
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(t.editEntry.deleteTitle, t.editEntry.deleteMessage, [
      { text: t.editEntry.deleteCancel, style: 'cancel' },
      {
        text: t.editEntry.deleteConfirm,
        style: 'destructive',
        onPress: handleDelete,
      },
    ]);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEntry(Number(id));
      Keyboard.dismiss();
      setSuccess(true);
    } catch {
      setError(t.editEntry.deleteError);
      setDeleting(false);
    }
  }

  async function handleCopy(field: 'login' | 'password') {
    await Clipboard.setStringAsync(field === 'login' ? login : password);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopied(field);
    copyTimeoutRef.current = setTimeout(() => setCopied(null), 1500);
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

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      </ThemedView>
    );
  }

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
              {t.editEntry.cancel}
            </ThemedText>
          </Pressable>

          <ThemedText type="smallBold" style={styles.headerTitle}>
            {t.editEntry.title}
          </ThemedText>

          <View style={styles.headerSide} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={0}
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
                    {t.editEntry.serviceLabel}
                  </ThemedText>
                </View>
                <TextInput
                  style={inputStyle}
                  placeholder={t.editEntry.servicePlaceholder}
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
                    {t.editEntry.loginLabel}
                  </ThemedText>
                </View>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={loginRef}
                    style={[inputStyle, styles.passwordInput]}
                    placeholder={t.editEntry.loginPlaceholder}
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
                  <Pressable
                    onPress={() => handleCopy('login')}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.eyeBtn,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: copied === 'login' ? '#34c759' : theme.backgroundSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={
                        copied === 'login'
                          ? { ios: 'checkmark', android: 'check', web: 'check' }
                          : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }
                      }
                      size={15}
                      tintColor={copied === 'login' ? '#34c759' : theme.textSecondary}
                    />
                  </Pressable>
                </View>
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
                    {t.editEntry.passwordLabel}
                  </ThemedText>
                </View>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    style={[inputStyle, styles.passwordInput]}
                    placeholder={t.editEntry.passwordPlaceholder}
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
                    onPress={() => handleCopy('password')}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.eyeBtn,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: copied === 'password' ? '#34c759' : theme.backgroundSelected,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={
                        copied === 'password'
                          ? { ios: 'checkmark', android: 'check', web: 'check' }
                          : { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }
                      }
                      size={15}
                      tintColor={copied === 'password' ? '#34c759' : theme.textSecondary}
                    />
                  </Pressable>
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
                {t.editEntry.generate}
              </ThemedText>
            </Pressable>
          </ScrollView>

          {/* Bottom action bar */}
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
              onPress={confirmDelete}
              disabled={deleting || saving}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.deleteBtn,
                { borderColor: '#ff3b30' },
                (deleting || saving) && styles.actionDisabled,
                pressed && styles.pressed,
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ff3b30" />
              ) : (
                <ThemedText style={styles.deleteBtnText}>{t.editEntry.delete}</ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={!canSave || saving || deleting}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.saveBtn,
                (!canSave || saving || deleting) && styles.actionDisabled,
                pressed && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.saveBtnText}>{t.editEntry.save}</ThemedText>
              )}
            </Pressable>
          </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerTitle: {
    flex: 2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
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
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  deleteBtn: {
    borderWidth: 1.5,
  },
  deleteBtnText: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#3c87f7',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
