import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { readAutoLockTimeout } from '@/features/settings/lib/auto-lock-storage';

export function useAutoLock(lock: () => void) {
  const backgroundAt = useRef<number | null>(null);
  const lockRef = useRef(lock);
  lockRef.current = lock;

  useEffect(() => {
    const handleChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        backgroundAt.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundAt.current === null) return;
        const elapsed = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        const timeout = await readAutoLockTimeout();
        if (timeout === 0) return;
        if (elapsed >= timeout * 1000) {
          lockRef.current();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);
}
