import { useCallback, useEffect, type ReactNode } from 'react';

import { LayoutContext } from './layout-context.tsx';
import { useLayouts } from '../../hooks/use-layouts.tsx';

import type { Layout } from './layout-context.tsx';

type LayoutProviderProps = { children: ReactNode };

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
