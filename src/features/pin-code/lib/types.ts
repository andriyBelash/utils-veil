export type PinFlowState =
  | 'loading'
  | 'create'
  | 'confirm'
  | 'enter'
  | 'authenticated'
  | 'change-verify'
  | 'change-create'
  | 'change-confirm';

export type PinContextValue = {
  flowState: PinFlowState;
  pendingPin: string;
  lockedUntil: number;
  startConfirm: (pin: string) => void;
  backToCreate: () => void;
  confirmPin: (pin: string) => Promise<boolean>;
  unlockPin: (pin: string) => Promise<boolean>;
  startChangePin: () => void;
  cancelChangePin: () => void;
  verifyCurrentPin: (pin: string) => Promise<boolean>;
  beginChangePinCreate: () => void;
  unlockWithBiometric: (prompt?: string) => Promise<boolean>;
  lock: () => void;
};
