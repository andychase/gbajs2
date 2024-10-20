import { ThemeProvider } from 'styled-components';

import './App.css';
import { ControlPanel } from './components/controls/control-panel.tsx';
import { VirtualControls } from './components/controls/virtual-controls.tsx';
import { ModalContainer } from './components/modals/modal-container.tsx';
import { NavigationMenu } from './components/navigation-menu/navigation-menu.tsx';
import { ProductTourIntro } from './components/product-tour/product-tour-intro.tsx';
import { PwaPrompt } from './components/pwa-prompt/pwa-prompt.tsx';
import { Screen } from './components/screen/screen.tsx';
import { AppErrorBoundary } from './components/shared/error-boundary.tsx';
import { ToasterWithDefaults } from './components/toast/toaster.tsx';
import { AuthProvider } from './context/auth/auth.tsx';
import { EmulatorContextProvider } from './context/emulator/emulator-context-provider.tsx';
import { LayoutProvider } from './context/layout/layout.tsx';
import { ModalProvider } from './context/modal/modal.tsx';
import { GbaDarkTheme } from './context/theme/theme.tsx';

export const App = () => {
  return (
    <ThemeProvider theme={GbaDarkTheme}>
      <AppErrorBoundary>
        <ProductTourIntro />
        <ToasterWithDefaults />
        <AuthProvider>
          <EmulatorContextProvider>
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
          </EmulatorContextProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
};
