import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getAllItems } from '../lib/db';
import type { VaultItem } from '../lib/types';

type State = {
  items: VaultItem[];
  loading: boolean;
};

/**
 * Loads vault items (optionally scoped to one album). Reloads on screen focus
 * and whenever `reloadKey` changes — the latter lets a parent tab host force a
 * refresh after an action it owns (e.g. import) mutates the data.
 */
export function useVaultItems(albumId?: string, reloadKey?: number) {
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

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return { ...state, reload: load };
}
