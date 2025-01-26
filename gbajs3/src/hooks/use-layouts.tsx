import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';

import type { Layouts } from '../context/layout/layout-context.tsx';

const layoutLocalStorageKey = 'componentLayouts';

export const useLayouts = () => {
  const [layouts, setLayouts] = useLocalStorage<Layouts>(
    layoutLocalStorageKey,
    {}
  );

  const clearLayouts = useCallback(() => setLayouts({}), [setLayouts]);

  return { layouts, setLayouts, clearLayouts };
};
