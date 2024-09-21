import { createContext, useCallback, useEffect, type ReactNode } from 'react';

import { useLayouts } from '../../hooks/use-layouts.tsx';

export type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
  initialBounds?: DOMRect;
};

export type Layouts = {
  [key: string]: Layout;
};

type LayoutContextProps = {
  layouts: Layouts;
  hasSetLayout: boolean;
  clearLayouts: () => void;
  setLayout: (layoutKey: string, layout: Layout) => void;
  setLayouts: (layouts: Layouts) => void;
};

type LayoutProviderProps = { children: ReactNode };

export const LayoutContext = createContext<LayoutContextProps | null>(null);

LayoutContext.displayName = 'LayoutContext';

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const { layouts, setLayouts, hasSetLayout, clearLayouts } = useLayouts();

  const setLayout = useCallback(
    (layoutKey: string, layout: Layout) =>
      setLayouts((prevState) => {
        return {
          ...prevState,
          [layoutKey]: { ...prevState?.[layoutKey], ...layout }
        };
      }),
    [setLayouts]
  );

  useEffect(() => {
    if (!hasSetLayout) {
      clearLayouts();
    }
    // clears the initial bounds if no actual layouts are set on initial render only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        layouts,
        hasSetLayout,
        clearLayouts,
        setLayout,
        setLayouts
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
