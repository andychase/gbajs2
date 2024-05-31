import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';

import { useEmulator } from '../../hooks/use-emulator.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

type EmulatorContextProps = {
  emulator: GBAEmulator | null;
  canvas: HTMLCanvasElement | null;
  setCanvas: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
};

type EmulatorProviderProps = {
  children: ReactNode;
};

export const EmulatorContext = createContext<EmulatorContextProps | null>(null);

EmulatorContext.displayName = 'EmulatorContext';

export const EmulatorProvider = ({ children }: EmulatorProviderProps) => {
  const [canvas, setCanvas] = useState<EmulatorContextProps['canvas']>(null);
  const emulator = useEmulator(canvas);

  return (
    <EmulatorContext.Provider value={{ emulator, canvas, setCanvas }}>
      {children}
    </EmulatorContext.Provider>
  );
};
