import { DragProvider } from './providers/drag-provider.tsx';
import { EmulatorProvider } from './providers/emulator-provider.tsx';
import { ResizeProvider } from './providers/resize-provider.tsx';
import { RunningProvider } from './providers/running-provider.tsx';

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
