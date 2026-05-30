import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { readAutoLockTimeout } from '@/features/settings/lib/auto-lock-storage';
import { readBiometricEnabled } from '@/features/settings/lib/biometric-storage';
import { isUnlocked } from '@/features/vault/lib/crypto';

type Handlers = {
  /** Hard-lock: closes the DB, zeroizes the DEK, clears decrypted caches. */
  lock: () => void;
  /** Silent re-unlock via biometric; resolves false if unavailable/denied. */
  unlockWithBiometric: (prompt: string) => Promise<boolean>;
  biometricPrompt: string;
};

/**
 * Lifecycle-driven vault locking.
 *
 * Security model: the DEK must never sit in RAM while the app is backgrounded.
 * So on *every* background we hard-lock immediately (wipe key + close DB). The
 * auto-lock timeout no longer decides *whether* to wipe — only how the user gets
 * back in on return:
 *   • within the timeout (or "Never") + biometric on → silent biometric re-unlock
 *   • after the timeout                              → PIN screen
 *
 * Biometric prompting is owned here (not in the PIN screen) so cold start and
 * warm return share one path and never double-prompt.
 */
export function useAutoLock({ lock, unlockWithBiometric, biometricPrompt }: Handlers) {
  const backgroundAt = useRef<number | null>(null);
  // Mirror the latest closures so the AppState listener never goes stale without
  // having to re-subscribe (and without touching refs during render).
  const handlersRef = useRef({ lock, unlockWithBiometric, biometricPrompt });
  useEffect(() => {
    handlersRef.current = { lock, unlockWithBiometric, biometricPrompt };
  });

  // Cold start: if the vault is locked and biometric is on, offer it once.
  useEffect(() => {
    (async () => {
      if (isUnlocked()) return;
      if (await readBiometricEnabled()) {
        await handlersRef.current.unlockWithBiometric(handlersRef.current.biometricPrompt);
      }
    })();
  }, [handlersRef]);

  useEffect(() => {
    const onChange = async (next: AppStateStatus) => {
      const handlers = handlersRef.current;
      if (next === 'background') {
        if (isUnlocked()) {
          backgroundAt.current = Date.now();
          handlers.lock();
        }
      } else if (next === 'active') {
        const bg = backgroundAt.current;
        backgroundAt.current = null;
        if (bg === null) return; // wasn't unlocked when we left
        const timeout = await readAutoLockTimeout(); // seconds; 0 = "Never"
        const withinGrace = timeout === 0 || Date.now() - bg < timeout * 1000;
        if (!withinGrace) return; // grace expired → PIN screen stays up
        if (await readBiometricEnabled()) {
          await handlers.unlockWithBiometric(handlers.biometricPrompt);
        }
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [handlersRef]);
}
