import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getAllItems } from '../lib/db';
import type { VaultItem } from '../lib/types';

type State = {
  items: VaultItem[];
  loading: boolean;
};

export function useVaultItems(albumId?: string) {
  const [state, setState] = useState<State>({ items: [], loading: true });

  // Note: we don't flip `loading` back to true on refetch. The hook reloads on
  // every screen focus; showing the spinner each time would tear down the grid
  // and flash on every back-navigation. Initial `loading: true` covers the
  // first paint; later refetches swap items in place.
  const load = useCallback(async () => {
    try {
      const items = await getAllItems(albumId);
      setState({ items, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { ...state, reload: load };
}
