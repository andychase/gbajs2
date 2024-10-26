import { useState, type ReactNode } from 'react';

import { DragContext } from '../contexts/drag-context.tsx';

type DragProviderProps = {
  children: ReactNode;
};

export const DragProvider = ({ children }: DragProviderProps) => {
  const [areItemsDraggable, setAreItemsDraggable] = useState(false);

  return (
    <DragContext.Provider value={{ areItemsDraggable, setAreItemsDraggable }}>
      {children}
    </DragContext.Provider>
  );
};
