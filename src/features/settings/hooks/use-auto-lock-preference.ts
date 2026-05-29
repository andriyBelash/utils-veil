import { useEffect, useState } from 'react';

import { readAutoLockTimeout, writeAutoLockTimeout, type AutoLockTimeout } from '../lib/auto-lock-storage';

export function useAutoLockPreference() {
  const [timeout, setTimeoutValue] = useState<AutoLockTimeout>(60);

  useEffect(() => {
    readAutoLockTimeout().then(setTimeoutValue);
  }, []);

  async function setAutoLock(t: AutoLockTimeout) {
    setTimeoutValue(t);
    await writeAutoLockTimeout(t);
  }

  return { timeout, setAutoLock };
}
