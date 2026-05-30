import { useFocusEffect } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type AddAction = () => void;

type AddActionValue = {
  action: AddAction | null;
  setAction: (action: AddAction | null) => void;
};

const AddActionContext = createContext<AddActionValue | null>(null);

/**
 * Holds the action the center "+" tab runs. The focused screen registers its
 * own handler (via {@link useRegisterAddAction}) so the button is contextual:
 * import photos on the gallery tabs, create an album on Albums.
 */
export function AddActionProvider({ children }: { children: React.ReactNode }) {
  const [action, setActionState] = useState<AddAction | null>(null);

  // Wrap in an updater so a function value isn't mistaken for a lazy initializer.
  const setAction = useCallback((next: AddAction | null) => {
    setActionState(() => next);
  }, []);

  const value = useMemo(() => ({ action, setAction }), [action, setAction]);

  return (
    <AddActionContext.Provider value={value}>
      {children}
    </AddActionContext.Provider>
  );
}

function useAddActionContext(): AddActionValue {
  const value = useContext(AddActionContext);
  if (!value)
    throw new Error('useAddAction must be used inside AddActionProvider');
  return value;
}

/** Consumed by the tab bar's center button: the action to run, and whether one exists. */
export function useAddAction(): {
  run: AddAction | undefined;
  enabled: boolean;
} {
  const { action } = useAddActionContext();
  return { run: action ?? undefined, enabled: action != null };
}

/**
 * Registers the center "+" action for as long as this screen is focused, and
 * clears it on blur. Pass a stable callback (wrap in `useCallback`).
 */
export function useRegisterAddAction(action: AddAction) {
  const { setAction } = useAddActionContext();
  useFocusEffect(
    useCallback(() => {
      setAction(action);
      return () => setAction(null);
    }, [action, setAction]),
  );
}
