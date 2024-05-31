import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';

type RunningContextProps = {
  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
};

type RunningProviderProps = {
  children: ReactNode;
};

export const RunningContext = createContext<RunningContextProps | null>(null);

RunningContext.displayName = 'RunningContext';

export const RunningProvider = ({ children }: RunningProviderProps) => {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <RunningContext.Provider value={{ isRunning, setIsRunning }}>
      {children}
    </RunningContext.Provider>
  );
};
