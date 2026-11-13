import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_APPEARANCE, applyAppearance, loadAppearance, saveAppearance, type Appearance } from "./appearance";

interface AppearanceContextValue extends Appearance {
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  ...DEFAULT_APPEARANCE,
  update: () => undefined,
  reset: () => undefined,
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Appearance>(loadAppearance);

  useEffect(() => {
    applyAppearance(state);
    saveAppearance(state);
  }, [state]);

  const update = useCallback((patch: Partial<Appearance>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(DEFAULT_APPEARANCE), []);
  const value = useMemo(() => ({ ...state, update, reset }), [state, update, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
