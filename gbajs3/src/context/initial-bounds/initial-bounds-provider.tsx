import { useOrientation, useWindowSize } from '@uidotdev/usehooks';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { InitialBoundsContext } from './initial-bounds-context.tsx';

import type { InitialBounds } from './initial-bounds-context.tsx';

type InitialBoundsProviderProps = { children: ReactNode };

export const InitialBoundsProvider = ({
  children
}: InitialBoundsProviderProps) => {
  const [initialBounds, setInitialBounds] = useState<InitialBounds>();
  const orientation = useOrientation();
  const windowSize = useWindowSize();

  const setInitialBound = useCallback(
    (key: string, bounds?: DOMRect) =>
      setInitialBounds((prevState) => ({ ...prevState, [key]: bounds })),
    []
  );

  const clearInitialBounds = useCallback(
    () => setInitialBounds(undefined),
    [setInitialBounds]
  );

  useEffect(() => {
    if (orientation.angle !== null && [0, 90, 270].includes(orientation.angle))
      clearInitialBounds();
  }, [clearInitialBounds, orientation.angle]);

  useEffect(() => {
    if (windowSize.width && windowSize.height) clearInitialBounds();
  }, [clearInitialBounds, windowSize.width, windowSize.height]);

  return (
    <InitialBoundsContext.Provider
      value={{
        initialBounds,
        setInitialBound,
        clearInitialBounds
      }}
    >
      {children}
    </InitialBoundsContext.Provider>
  );
};
