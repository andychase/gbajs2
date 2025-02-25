import {
  useLocalStorage,
  useMediaQuery,
  useOrientation
} from '@uidotdev/usehooks';
import { useCallback, type ReactNode } from 'react';
import { useTheme } from 'styled-components';

import { LayoutContext } from './layout-context.tsx';

import type { Layout, Layouts } from './layout-context.tsx';

type LayoutProviderProps = { children: ReactNode };

const layoutLocalStorageKey = 'componentLayoutsV2';

export const LayoutProvider = ({ children }: LayoutProviderProps) => {
  const [layouts, setLayouts] = useLocalStorage<Layouts>(
    layoutLocalStorageKey,
    {}
  );
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const isMobileLandscape = useMediaQuery(theme.isMobileLandscape);
  const orientation = useOrientation();

  const clearLayouts = useCallback(() => setLayouts({}), [setLayouts]);

  const layoutType =
    isLargerThanPhone && !isMobileLandscape
      ? 'desktop'
      : orientation.type.startsWith('landscape')
      ? 'landscape'
      : 'portrait';

  const setLayout = useCallback(
    (layoutKey: string, layout: Layout) =>
      setLayouts((prevState) => {
        return {
          ...prevState,
          [layoutKey]: {
            ...prevState[layoutKey],
            [layoutType]: {
              ...prevState[layoutKey]?.[layoutType],
              ...layout
            }
          }
        };
      }),
    [setLayouts, layoutType]
  );

  const getLayout = useCallback(
    (layoutKey: string) => layouts?.[layoutKey]?.[layoutType],
    [layouts, layoutType]
  );

  return (
    <LayoutContext.Provider
      value={{
        layouts,
        getLayout,
        clearLayouts,
        setLayout,
        setLayouts
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
