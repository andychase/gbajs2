import { createContext } from 'react';

import type { Dispatch, SetStateAction } from 'react';

type RunningContextProps = {
  isRunning: boolean;
  setIsRunning: Dispatch<SetStateAction<boolean>>;
};

export const RunningContext = createContext<RunningContextProps | null>(null);

RunningContext.displayName = 'RunningContext';
