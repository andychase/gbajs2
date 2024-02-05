import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { AuthProvider } from '../src/context/auth/auth.tsx';
import { EmulatorProvider } from '../src/context/emulator/emulator.tsx';
import { LayoutProvider } from '../src/context/layout/layout.tsx';
import { ModalProvider } from '../src/context/modal/modal.tsx';
import { GbaDarkTheme } from '../src/context/theme/theme.tsx';

import type { ReactNode } from 'react';

export const renderWithContext = (testNode: ReactNode) => {
  return render(
    <ThemeProvider theme={GbaDarkTheme}>
      <AuthProvider>
        <EmulatorProvider>
          <LayoutProvider>
            <ModalProvider>{testNode}</ModalProvider>
          </LayoutProvider>
        </EmulatorProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
