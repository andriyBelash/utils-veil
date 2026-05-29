import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  changePin as cryptoChangePin,
  hasVault,
  initializeVault,
  isUnlocked,
  lockVault,
  unlockVault,
  unlockVaultWithBiometric,
  verifyPin,
} from '@/features/vault/lib/crypto';

import { getLockedUntil, recordFailure, resetAttempts } from '../lib/attempts';
import type { PinContextValue, PinFlowState } from '../lib/types';

const PinContext = createContext<PinContextValue | null>(null);

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [flowState, setFlowState] = useState<PinFlowState>('loading');
  const [pendingPin, setPendingPin] = useState('');
  const [lockedUntil, setLockedUntil] = useState(0);
  const isChangingPin = useRef(false);
  const verifiedOldPin = useRef<string | null>(null);

  useEffect(() => {
    async function init() {
      setLockedUntil(await getLockedUntil());
      if (await hasVault()) {
        setFlowState('enter');
        return;
      }
      setFlowState('create');
    }
    init();
  }, []);

  const startConfirm = useCallback((pin: string) => {
    setPendingPin(pin);
    setFlowState(isChangingPin.current ? 'change-confirm' : 'confirm');
  }, []);

  const backToCreate = useCallback(() => {
    setPendingPin('');
    setFlowState(isChangingPin.current ? 'change-create' : 'create');
  }, []);

  const confirmPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (pin !== pendingPin) return false;
      if (isChangingPin.current) {
        const oldPin = verifiedOldPin.current;
        if (!oldPin) return false;
        const ok = await cryptoChangePin(oldPin, pin);
        if (!ok) return false;
        verifiedOldPin.current = null;
        isChangingPin.current = false;
      } else {
        await initializeVault(pin);
      }
      setFlowState('authenticated');
      return true;
    },
    [pendingPin],
  );

  const unlockPin = useCallback(async (pin: string): Promise<boolean> => {
    if ((await getLockedUntil()) > Date.now()) {
      setLockedUntil(await getLockedUntil());
      return false;
    }
    const ok = await unlockVault(pin);
    if (ok) {
      await resetAttempts();
      setLockedUntil(0);
      setFlowState('authenticated');
    } else {
      setLockedUntil(await recordFailure());
    }
    return ok;
  }, []);

  const startChangePin = useCallback(() => {
    isChangingPin.current = true;
    setFlowState('change-verify');
  }, []);

  const cancelChangePin = useCallback(() => {
    isChangingPin.current = false;
    verifiedOldPin.current = null;
    setFlowState('authenticated');
  }, []);

  const verifyCurrentPin = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin);
    if (ok) verifiedOldPin.current = pin;
    return ok;
  }, []);

  const beginChangePinCreate = useCallback(() => {
    setFlowState('change-create');
  }, []);

  const unlockWithBiometric = useCallback(async (prompt: string = 'Unlock PassVault'): Promise<boolean> => {
    const ok = await unlockVaultWithBiometric(prompt);
    if (ok) setFlowState('authenticated');
    return ok;
  }, []);

  const lock = useCallback(() => {
    if (!isUnlocked()) return;
    lockVault();
    setFlowState('enter');
  }, []);

  return (
    <PinContext.Provider
      value={{
        flowState,
        pendingPin,
        lockedUntil,
        startConfirm,
        backToCreate,
        confirmPin,
        unlockPin,
        startChangePin,
        cancelChangePin,
        verifyCurrentPin,
        beginChangePinCreate,
        unlockWithBiometric,
        lock,
      }}
    >
      {children}
    </PinContext.Provider>
  );
}

export function usePinContext(): PinContextValue {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePinContext must be used within PinProvider');
  return ctx;
}
