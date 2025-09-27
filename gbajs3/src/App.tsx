import { ThemeProvider } from 'styled-components';

import './App.css';
import { ControlPanel } from './components/controls/control-panel.tsx';
import { VirtualControls } from './components/controls/virtual-controls.tsx';
import { ModalContainer } from './components/modals/modal-container.tsx';
import { NavigationMenu } from './components/navigation-menu/navigation-menu.tsx';
import { PwaPrompt } from './components/pwa-prompt/pwa-prompt.tsx';
import { Screen } from './components/screen/screen.tsx';
import { AppErrorBoundary } from './components/shared/error-boundary.tsx';
import { ToasterWithDefaults } from './components/toast/toaster.tsx';
import { AuthProvider } from './context/auth/auth-provider.tsx';
import { EmulatorContextProvider } from './context/emulator/emulator-context-provider.tsx';
import { InitialBoundsProvider } from './context/initial-bounds/initial-bounds-provider.tsx';
import { LayoutProvider } from './context/layout/layout-provider.tsx';
import { ModalProvider } from './context/modal/modal-provider.tsx';
import { GbaDarkTheme } from './context/theme/theme.tsx';

export const App = () => (
  <ThemeProvider theme={GbaDarkTheme}>
    <AppErrorBoundary>
      <ToasterWithDefaults />
      <AuthProvider>
        <EmulatorContextProvider>
          <InitialBoundsProvider>
            <LayoutProvider>
              <ModalProvider>
                <PwaPrompt />
                <NavigationMenu />
                <Screen />
                <ControlPanel />
                <VirtualControls />
                <ModalContainer />
              </ModalProvider>
            </LayoutProvider>
          </InitialBoundsProvider>
        </EmulatorContextProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </ThemeProvider>
);
