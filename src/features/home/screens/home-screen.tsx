import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLocale } from "@/features/localization";
import { useVaultEntries } from "@/features/vault";
import { useTheme } from "@/hooks/use-theme";

const LOGO_LIGHT = require("@/assets/images/logo/logo-light.svg");
const LOGO_DARK = require("@/assets/images/logo/logo-dark.png");

// NOTE: цей екран — заглушка після зрізання парольного донора.
// Далі він стане сіткою зашифрованих thumbnail'ів (див. docs/docs.md).
export function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useLocale();
  const { loading } = useVaultEntries();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View
          style={[styles.header, { borderBottomColor: theme.backgroundElement }]}
        >
          <View style={styles.brand}>
            <Image
              source={colorScheme === "dark" ? LOGO_LIGHT : LOGO_DARK}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="smallBold">Veil</ThemedText>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{ ios: "gearshape", android: "settings", web: "settings" }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : (
          <View style={styles.center}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                name={{ ios: "photo.on.rectangle", android: "photo_library", web: "photo_library" }}
                size={32}
                tintColor={theme.textSecondary}
              />
            </View>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              {t.home.emptyTitle}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptySubtitle}
            >
              {t.home.emptySubtitle}
            </ThemedText>
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  logo: {
    width: 36,
    height: 36,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
});
