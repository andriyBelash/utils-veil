import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { AddActionProvider, TabBarVisibilityProvider, VeilTabBar } from '@/features/tabs';

export default function TabsLayout() {
  return (
    <TabBarVisibilityProvider>
      <AddActionProvider>
        <Tabs>
          <TabSlot />
          {/* Defines the routes; the visible bar lives in VeilTabBar. */}
          <TabList style={{ display: 'none' }}>
            <TabTrigger name="index" href="/" />
            <TabTrigger name="albums" href="/albums" />
            <TabTrigger name="favorites" href="/favorites" />
            <TabTrigger name="settings" href="/settings" />
          </TabList>
          <VeilTabBar />
        </Tabs>
      </AddActionProvider>
    </TabBarVisibilityProvider>
  );
}
