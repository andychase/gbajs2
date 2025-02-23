import { ThemeProvider } from 'styled-components';

import { AuthProvider } from '../src/context/auth/auth-provider.tsx';
import { EmulatorContextProvider } from '../src/context/emulator/emulator-context-provider.tsx';
import { InitialBoundsProvider } from '../src/context/initial-bounds/initial-bounds-provider.tsx';
import { LayoutProvider } from '../src/context/layout/layout-provider.tsx';
import { ModalProvider } from '../src/context/modal/modal-provider.tsx';
import { GbaDarkTheme } from '../src/context/theme/theme.tsx';

import type { ReactNode } from 'react';

export const AllTheProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={GbaDarkTheme}>
    <AuthProvider>
      <EmulatorContextProvider>
        <InitialBoundsProvider>
          <LayoutProvider>
            <ModalProvider>{children}</ModalProvider>
          </LayoutProvider>
        </InitialBoundsProvider>
      </EmulatorContextProvider>
    </AuthProvider>
  </ThemeProvider>
);
