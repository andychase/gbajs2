import { useState, type ReactNode } from 'react';

import { RunningContext } from '../contexts/running-context.tsx';

type RunningProviderProps = {
  children: ReactNode;
};

export const RunningProvider = ({ children }: RunningProviderProps) => {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <RunningContext.Provider value={{ isRunning, setIsRunning }}>
      {children}
    </RunningContext.Provider>
  );
};
