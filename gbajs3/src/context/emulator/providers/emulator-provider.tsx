import { useState, type ReactNode } from 'react';

import { useEmulator } from '../../../hooks/use-emulator.tsx';
import { EmulatorContext } from '../contexts/emulator-context.tsx';

type EmulatorProviderProps = {
  children: ReactNode;
};

export const EmulatorProvider = ({ children }: EmulatorProviderProps) => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const emulator = useEmulator(canvas);

  return (
    <EmulatorContext.Provider value={{ emulator, canvas, setCanvas }}>
      {children}
    </EmulatorContext.Provider>
  );
};
