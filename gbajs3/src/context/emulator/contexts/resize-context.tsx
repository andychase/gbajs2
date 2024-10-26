import { createContext } from 'react';

import type { Dispatch, SetStateAction } from 'react';

type ResizeContextProps = {
  areItemsResizable: boolean;
  setAreItemsResizable: Dispatch<SetStateAction<boolean>>;
};

export const ResizeContext = createContext<ResizeContextProps | null>(null);

ResizeContext.displayName = 'ResizeContext';
