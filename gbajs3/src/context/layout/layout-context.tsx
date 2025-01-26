import { createContext } from 'react';

export type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
};

export type Layouts = {
  [key: string]: Layout;
};

export type InitialBounds = {
  [key: string]: DOMRect | undefined;
};

export type LayoutContextProps = {
  layouts: Layouts;
  clearLayoutsAndBounds: () => void;
  initialBounds?: InitialBounds;
  setInitialBound: (key: string, bounds?: DOMRect) => void;
  setLayout: (layoutKey: string, layout: Layout) => void;
  setLayouts: (layouts: Layouts) => void;
};

export const LayoutContext = createContext<LayoutContextProps | null>(null);

LayoutContext.displayName = 'LayoutContext';
