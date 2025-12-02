import { createContext } from 'react';

export type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
  /** stored original initial bounds to maintain consistency when a layout is set for dependent children */
  originalBounds?: DOMRect;
  /** indicates whether or not this layout is standalone, and considered in any relative calculations or counts */
  standalone?: boolean;
  /** indicates which orientation is paired with this layout */
  orientation?: string;
  isLargerThanPhone?: boolean;
};

export type Layouts = {
  [key: string]: Partial<
    Record<'portrait' | 'landscape' | 'desktop', Layout> | undefined
  >;
};

type LayoutContextProps = {
  layouts: Layouts;
  getLayout: (layoutKey: string) => Layout | undefined;
  clearLayouts: () => void;
  setLayout: (layoutKey: string, layout: Layout) => void;
  setLayouts: (layouts: Layouts) => void;
};

export const LayoutContext = createContext<LayoutContextProps | null>(null);

LayoutContext.displayName = 'LayoutContext';
