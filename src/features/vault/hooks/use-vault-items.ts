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

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const items = await getAllItems(albumId);
      setState({ items, loading: false });
    } catch {
      setState({ items: [], loading: false });
    }
  }, [albumId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { ...state, reload: load };
}
