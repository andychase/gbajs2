import { createContext } from 'react';

import type { Dispatch, SetStateAction } from 'react';

type DragContextProps = {
  areItemsDraggable: boolean;
  setAreItemsDraggable: Dispatch<SetStateAction<boolean>>;
};

export const DragContext = createContext<DragContextProps | null>(null);

DragContext.displayName = 'DragContext';
