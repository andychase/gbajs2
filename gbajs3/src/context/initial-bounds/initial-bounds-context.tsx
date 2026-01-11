import { createContext } from 'react';

export type InitialBounds = Record<string, DOMRect | undefined>;

type InitialBoundsContextProps = {
  initialBounds?: InitialBounds;
  clearInitialBounds: () => void;
  setInitialBound: (key: string, bounds?: DOMRect) => void;
};

export const InitialBoundsContext =
  createContext<InitialBoundsContextProps | null>(null);

InitialBoundsContext.displayName = 'InitialBoundsContext';
