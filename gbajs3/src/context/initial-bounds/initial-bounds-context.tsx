import { createContext } from 'react';

export type InitialBounds = {
  [key: string]: DOMRect | undefined;
};

export type InitialBoundsContextProps = {
  initialBounds?: InitialBounds;
  clearInitialBounds: () => void;
  setInitialBound: (key: string, bounds?: DOMRect) => void;
};

export const InitialBoundsContext =
  createContext<InitialBoundsContextProps | null>(null);

InitialBoundsContext.displayName = 'InitialBoundsContext';
