import { ThemeProvider } from 'styled-components';

import { AuthProvider } from '../src/context/auth/auth.tsx';
import { EmulatorContextProvider } from '../src/context/emulator/emulator-context-provider.tsx';
import { LayoutProvider } from '../src/context/layout/layout.tsx';
import { ModalProvider } from '../src/context/modal/modal.tsx';
import { GbaDarkTheme } from '../src/context/theme/theme.tsx';

import type { ReactNode } from 'react';

export const AllTheProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={GbaDarkTheme}>
    <AuthProvider>
      <EmulatorContextProvider>
        <LayoutProvider>
          <ModalProvider>{children}</ModalProvider>
        </LayoutProvider>
      </EmulatorContextProvider>
    </AuthProvider>
  </ThemeProvider>
);
