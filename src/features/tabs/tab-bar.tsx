import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/features/localization';
import { useTheme } from '@/hooks/use-theme';

import { useAddAction } from './add-action';
import { useTabBarVisibility } from './tab-bar-visibility';

type IconName = SymbolViewProps['name'];

type TabButtonProps = TabTriggerSlotProps & {
  iconDefault: IconName;
  iconSelected: IconName;
  label: string;
};

/** A single navigating tab item; `isFocused`/`onPress` are forwarded by TabTrigger asChild. */
const TabBarButton = forwardRef<View, TabButtonProps>(function TabBarButton(
  { isFocused, iconDefault, iconSelected, label, ...rest },
  ref,
) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;
  return (
    <Pressable ref={ref} {...rest} style={styles.tabItem}>
      <SymbolView
        name={isFocused ? iconSelected : iconDefault}
        size={26}
        tintColor={color}
      />
      <ThemedText type="small" style={[styles.label, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

/** Center "+" — runs the focused screen's registered add action (photo or album). */
function CenterAddButton() {
  const theme = useTheme();
  const { run, enabled } = useAddAction();
  return (
    <View style={styles.centerSlot}>
      <Pressable
        onPress={run}
        disabled={!enabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary },
          (pressed || !enabled) && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={26}
          tintColor="#ffffff"
        />
      </Pressable>
    </View>
  );
}

/**
 * Fully custom tab bar (expo-router/ui). The native UITabBar can't run a custom
 * action on press, so we own the layout: four navigating tabs around a center
 * "+" that performs the focused screen's add action.
 */
export function VeilTabBar() {
  const theme = useTheme();
  const { t } = useLocale();
  const { hidden } = useTabBarVisibility();
  const insets = useSafeAreaInsets();

  if (hidden) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom || Spacing.two,
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundElement,
        },
      ]}
    >
      <TabTrigger name="index" asChild>
        <TabBarButton
          label={t.tabs.allPhotos}
          iconDefault={{
            ios: 'photo.on.rectangle',
            android: 'photo_library',
            web: 'photo_library',
          }}
          iconSelected={{
            ios: 'photo.fill.on.rectangle.fill',
            android: 'photo_library',
            web: 'photo_library',
          }}
        />
      </TabTrigger>
      <TabTrigger name="albums" asChild>
        <TabBarButton
          label={t.tabs.albums}
          iconDefault={{
            ios: 'rectangle.stack',
            android: 'collections',
            web: 'collections',
          }}
          iconSelected={{
            ios: 'rectangle.stack.fill',
            android: 'collections',
            web: 'collections',
          }}
        />
      </TabTrigger>

      <CenterAddButton />

      <TabTrigger name="favorites" asChild>
        <TabBarButton
          label={t.tabs.favorites}
          iconDefault={{
            ios: 'heart',
            android: 'favorite_border',
            web: 'favorite_border',
          }}
          iconSelected={{
            ios: 'heart.fill',
            android: 'favorite',
            web: 'favorite',
          }}
        />
      </TabTrigger>
      <TabTrigger name="settings" asChild>
        <TabBarButton
          label={t.tabs.settings}
          iconDefault={{
            ios: 'gearshape',
            android: 'settings',
            web: 'settings',
          }}
          iconSelected={{
            ios: 'gearshape.fill',
            android: 'settings',
            web: 'settings',
          }}
        />
      </TabTrigger>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { fontSize: 10 },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pressed: { opacity: 0.5 },
});
