import { DragProvider } from './drag.tsx';
import { EmulatorProvider } from './emulator.tsx';
import { ResizeProvider } from './resize.tsx';
import { RunningProvider } from './running.tsx';

import type { ReactNode } from 'react';

type EmulatorContextProviderProps = {
  children: ReactNode;
};

export const EmulatorContextProvider = ({
  children
}: EmulatorContextProviderProps) => {
  return (
    <EmulatorProvider>
      <RunningProvider>
        <DragProvider>
          <ResizeProvider>{children}</ResizeProvider>
        </DragProvider>
      </RunningProvider>
    </EmulatorProvider>
  );
};
