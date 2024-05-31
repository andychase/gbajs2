import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';

type DragContextProps = {
  areItemsDraggable: boolean;
  setAreItemsDraggable: Dispatch<SetStateAction<boolean>>;
};

type DragProviderProps = {
  children: ReactNode;
};

export const DragContext = createContext<DragContextProps | null>(null);

DragContext.displayName = 'DragContext';

export const DragProvider = ({ children }: DragProviderProps) => {
  const [areItemsDraggable, setAreItemsDraggable] = useState(false);

  return (
    <DragContext.Provider value={{ areItemsDraggable, setAreItemsDraggable }}>
      {children}
    </DragContext.Provider>
  );
};
