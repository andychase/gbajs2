import { useState, type ReactNode } from 'react';

import { ResizeContext } from '../contexts/resize-context.tsx';

type ResizeProviderProps = {
  children: ReactNode;
};

export const ResizeProvider = ({ children }: ResizeProviderProps) => {
  const [areItemsResizable, setAreItemsResizable] = useState(false);

  return (
    <ResizeContext.Provider value={{ areItemsResizable, setAreItemsResizable }}>
      {children}
    </ResizeContext.Provider>
  );
};
