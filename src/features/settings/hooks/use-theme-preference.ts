import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

import { type ThemePreference, readThemePreference, writeThemePreference } from '../lib/theme-storage';

function applyPreference(pref: ThemePreference) {
  if (pref === 'light') Appearance.setColorScheme('light');
  else if (pref === 'dark') Appearance.setColorScheme('dark');
  else Appearance.setColorScheme('unspecified' as any);
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    readThemePreference().then((pref) => {
      setPreference(pref);
      applyPreference(pref);
    });
  }, []);

  async function setTheme(pref: ThemePreference) {
    setPreference(pref);
    applyPreference(pref);
    await writeThemePreference(pref);
  }

  return { preference, setTheme };
}
