import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';

type ResizeContextProps = {
  areItemsResizable: boolean;
  setAreItemsResizable: Dispatch<SetStateAction<boolean>>;
};

type ResizeProviderProps = {
  children: ReactNode;
};

export const ResizeContext = createContext<ResizeContextProps | null>(null);

ResizeContext.displayName = 'ResizeContext';

export const ResizeProvider = ({ children }: ResizeProviderProps) => {
  const [areItemsResizable, setAreItemsResizable] = useState(false);

  return (
    <ResizeContext.Provider value={{ areItemsResizable, setAreItemsResizable }}>
      {children}
    </ResizeContext.Provider>
  );
};
