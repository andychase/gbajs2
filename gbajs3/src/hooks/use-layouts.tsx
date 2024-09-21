import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useMemo } from 'react';

import type { Layouts } from '../context/layout/layout';

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
