import { useOrientation, useWindowSize } from '@uidotdev/usehooks';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';

import { InitialBoundsContext } from './initial-bounds-context.tsx';

import type { InitialBounds } from './initial-bounds-context.tsx';

type InitialBoundsProviderProps = {
  children: ReactNode;
};

export const InitialBoundsProvider = ({
  children
}: InitialBoundsProviderProps) => {
  const [initialBounds, setInitialBounds] = useState<InitialBounds>();
  const orientation = useOrientation();
  const prevOrientation = useRef<number>(orientation.angle);
  const windowSize = useWindowSize();
  const prevSize = useRef<{
    width: number | null;
    height: number | null;
  }>(windowSize);

  const setInitialBound = useCallback((key: string, bounds?: DOMRect) => {
    setInitialBounds((prevState) => ({ ...prevState, [key]: bounds }));
  }, []);

  const clearInitialBounds = useCallback(() => {
    setInitialBounds(undefined);
  }, [setInitialBounds]);

  const hasInitialBounds = !!initialBounds;

  useEffect(() => {
    if (
      orientation.angle !== prevOrientation.current &&
      [0, 90, 270].includes(orientation.angle) &&
      hasInitialBounds
    ) {
      clearInitialBounds();
      prevOrientation.current = orientation.angle;
    }
  }, [clearInitialBounds, orientation.angle, hasInitialBounds]);

  useEffect(() => {
    if (
      windowSize.width !== prevSize.current.width &&
      windowSize.height !== prevSize.current.height &&
      hasInitialBounds
    ) {
      clearInitialBounds();
      prevSize.current = {
        width: windowSize.width,
        height: windowSize.height
      };
    }
  }, [
    clearInitialBounds,
    windowSize.width,
    windowSize.height,
    hasInitialBounds
  ]);

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
