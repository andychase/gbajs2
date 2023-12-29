import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useMemo } from 'react';

type Layout = {
  position?: { x: number; y: number };
  size?: { width: string | number; height: string | number };
  initialBounds?: DOMRect;
};

type Layouts = {
  [key: string]: Layout;
};

const layoutLocalStorageKey = 'componentLayouts';

export const useLayouts = () => {
  const [layouts, setLayouts] = useLocalStorage<Layouts>(
    layoutLocalStorageKey,
    {}
  );

  const clearLayouts = useCallback(() => setLayouts({}), [setLayouts]);

  const hasSetLayout = useMemo(
    () =>
      !!Object.values(layouts).some(
        (layout) => !!layout?.position || !!layout?.size
      ),
    [layouts]
  );

  return { layouts, setLayouts, hasSetLayout, clearLayouts };
};
