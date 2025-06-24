import { useState, type ReactNode } from 'react';

import { useRestoreAutoSaveStateData } from '../../../hooks/emulator/use-restore-auto-save-state.tsx';
import { useEmulator } from '../../../hooks/use-emulator.tsx';
import { EmulatorContext } from '../contexts/emulator-context.tsx';

type EmulatorProviderProps = {
  children: ReactNode;
};

export const EmulatorProvider = ({ children }: EmulatorProviderProps) => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const emulator = useEmulator(canvas);

  useRestoreAutoSaveStateData(emulator);

  return (
    <EmulatorContext.Provider value={{ emulator, canvas, setCanvas }}>
      {children}
    </EmulatorContext.Provider>
  );
};
