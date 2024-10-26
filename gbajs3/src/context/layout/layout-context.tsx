import { createContext } from 'react';

export type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
  initialBounds?: DOMRect;
};

export type Layouts = {
  [key: string]: Layout;
};

export type LayoutContextProps = {
  layouts: Layouts;
  hasSetLayout: boolean;
  clearLayouts: () => void;
  setLayout: (layoutKey: string, layout: Layout) => void;
  setLayouts: (layouts: Layouts) => void;
};

export const LayoutContext = createContext<LayoutContextProps | null>(null);

LayoutContext.displayName = 'LayoutContext';
