import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type TabBarVisibilityValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityValue | null>(null);

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHiddenState] = useState(false);

  const setHidden = useCallback((next: boolean) => {
    setHiddenState(next);
  }, []);

  const value = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);

  return (
    <TabBarVisibilityContext.Provider value={value}>{children}</TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility(): TabBarVisibilityValue {
  const value = useContext(TabBarVisibilityContext);
  if (!value) throw new Error('useTabBarVisibility must be used inside TabBarVisibilityProvider');
  return value;
}
