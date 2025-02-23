import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, type ReactNode } from 'react';

import { LayoutContext } from './layout-context.tsx';

import type { Layout, Layouts } from './layout-context.tsx';

type LayoutProviderProps = { children: ReactNode };

const layoutLocalStorageKey = 'componentLayouts';

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [layouts, setLayouts] = useLocalStorage<Layouts>(
    layoutLocalStorageKey,
    {}
  );

  const clearLayouts = useCallback(() => setLayouts({}), [setLayouts]);

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

  return (
    <LayoutContext.Provider
      value={{
        layouts,
        clearLayouts,
        setLayout,
        setLayouts
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
