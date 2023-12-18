import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'styled-components';

import './App.css';
import { ControlPanel } from './components/controls/control-panel.tsx';
import { VirtualControls } from './components/controls/virtual-controls.tsx';
import { ModalContainer } from './components/modals/modal-container.tsx';
import { NavigationMenu } from './components/navigation-menu/navigation-menu.tsx';
import { ProductTourIntro } from './components/product-tour/product-tour-intro.tsx';
import { PwaPrompt } from './components/pwa-prompt/pwa-prompt.tsx';
import { Screen } from './components/screen/screen.tsx';
import { AuthProvider } from './context/auth/auth.tsx';
import { EmulatorProvider } from './context/emulator/emulator.tsx';
import { LayoutProvider } from './context/layout/layout.tsx';
import { ModalProvider } from './context/modal/modal.tsx';
import { GbaDarkTheme } from './context/theme/theme.tsx';

export const App = () => {
  return (
    <ThemeProvider theme={GbaDarkTheme}>
      <ProductTourIntro />
      <Toaster />
      <PwaPrompt />
      <AuthProvider>
        <EmulatorProvider>
          <LayoutProvider>
            <ModalProvider>
              <NavigationMenu />
              <Screen />
              <ControlPanel />
              <VirtualControls />
              <ModalContainer />
            </ModalProvider>
          </LayoutProvider>
        </EmulatorProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
