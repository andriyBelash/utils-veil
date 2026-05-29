import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getAllEntries } from '../lib/db';
import type { VaultEntry } from '../lib/types';

type State = {
  entries: VaultEntry[];
  loading: boolean;
};

export function useVaultEntries() {
  const [state, setState] = useState<State>({ entries: [], loading: true });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const entries = await getAllEntries();
      setState({ entries, loading: false });
    } catch {
      setState({ entries: [], loading: false });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { ...state, reload: load };
}
