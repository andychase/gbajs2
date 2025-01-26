import { useOrientation } from '@uidotdev/usehooks';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { LayoutContext } from './layout-context.tsx';
import { useLayouts } from '../../hooks/use-layouts.tsx';

import type { InitialBounds, Layout } from './layout-context.tsx';

type LayoutProviderProps = { children: ReactNode };

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const { layouts, setLayouts, clearLayouts } = useLayouts();
  const [initialBounds, setInitialBounds] = useState<InitialBounds>();
  const orientation = useOrientation();

  const setLayout = useCallback(
    (layoutKey: string, layout: Layout) =>
      setLayouts((prevState) => ({
        ...prevState,
        [layoutKey]: { ...prevState?.[layoutKey], ...layout }
      })),
    [setLayouts]
  );

  const setInitialBound = useCallback(
    (key: string, bounds?: DOMRect) =>
      setInitialBounds((prevState) => ({ ...prevState, [key]: bounds })),
    []
  );

  const clearLayoutsAndBounds = useCallback(() => {
    clearLayouts();
    setInitialBounds({});
  }, [clearLayouts]);

  useEffect(() => {
    if (orientation.angle !== null && [0, 90, 270].includes(orientation.angle))
      setInitialBounds({});
  }, [setInitialBounds, orientation.angle]);

  return (
    <LayoutContext.Provider
      value={{
        initialBounds,
        setInitialBound,
        layouts,
        clearLayoutsAndBounds,
        setLayout,
        setLayouts
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
