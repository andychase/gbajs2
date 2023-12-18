import { useLocalStorage } from '@uidotdev/usehooks';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode
} from 'react';

type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
  initialBounds?: DOMRect;
};

type Layouts = {
  [key: string]: Layout;
};

type LayoutContextProps = {
  layouts: Layouts;
  hasSetLayout: boolean;
  clearLayouts: () => void;
  setLayout: (layoutKey: string, layout: Layout) => void;
};

type LayoutProviderProps = { children: ReactNode };

const layoutLocalStorageKey = 'componentLayouts';

export const LayoutContext = createContext<LayoutContextProps>({
  layouts: {},
  hasSetLayout: false,
  clearLayouts: () => undefined,
  setLayout: () => undefined
});

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [layouts, setLayouts] = useLocalStorage<Layouts>(
    layoutLocalStorageKey,
    {}
  );
  const hasSetLayout = useMemo(
    () =>
      !!Object.values(layouts).some(
        (layout) => !!layout?.position || !!layout?.size
      ),
    [layouts]
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
        setLayout
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
