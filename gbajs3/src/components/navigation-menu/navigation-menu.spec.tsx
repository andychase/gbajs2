import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as toast from 'react-hot-toast';
import { describe, expect, it, vi } from 'vitest';

import { NavigationMenuWidth } from './consts.tsx';
import { NavigationMenu } from './navigation-menu.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as quickReloadHooks from '../../hooks/emulator/use-quick-reload.tsx';
import * as logoutHooks from '../../hooks/use-logout.tsx';
import { AboutModal } from '../modals/about.tsx';
import { CheatsModal } from '../modals/cheats.tsx';
import { ControlsModal } from '../modals/controls.tsx';
import { DownloadSaveModal } from '../modals/download-save.tsx';
import { EmulatorSettingsModal } from '../modals/emulator-settings.tsx';
import { FileSystemModal } from '../modals/file-system.tsx';
import { ImportExportModal } from '../modals/import-export.tsx';
import { LegalModal } from '../modals/legal.tsx';
import { LoadLocalRomModal } from '../modals/load-local-rom.tsx';
import { LoadRomModal } from '../modals/load-rom.tsx';
import { LoadSaveModal } from '../modals/load-save.tsx';
import { LoginModal } from '../modals/login.tsx';
import { SaveStatesModal } from '../modals/save-states.tsx';
import { UploadFilesModal } from '../modals/upload-files.tsx';
import { UploadRomToServerModal } from '../modals/upload-rom-to-server.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';
import type {
  UseMutateFunction,
  UseMutationResult
} from '@tanstack/react-query';

describe('<NavigationMenu />', () => {
  it('renders menu and dismiss buttons', () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByRole('list', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByLabelText('Menu Toggle')).toBeInTheDocument();
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();
    // renders default mounted menu items
    expect(screen.getAllByRole('listitem')).toHaveLength(13);
  });

  it('toggles menu with button', async () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 50}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Toggle'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(
      `left: -${NavigationMenuWidth + 5}px`
    );
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle('left: -5px');
    expect(screen.queryByLabelText('Menu Dismiss')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Toggle'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 50}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();
  });

  it('dismisses menu with overlay', async () => {
    renderWithContext(<NavigationMenu />);

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(`left: 0`);
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle(
      `left: ${NavigationMenuWidth - 50}px`
    );
    expect(screen.getByLabelText('Menu Dismiss')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu Dismiss'));

    expect(screen.getByTestId('menu-wrapper')).toHaveStyle(
      `left: -${NavigationMenuWidth + 5}px`
    );
    expect(screen.getByLabelText('Menu Toggle')).toHaveStyle('left: -5px');
    expect(screen.queryByLabelText('Menu Dismiss')).not.toBeInTheDocument();
  });

  describe('menu nodes', () => {
    it.each([
      ['About', <AboutModal />],
      ['Upload Files', <UploadFilesModal />],
      ['Controls', <ControlsModal />],
      ['File System', <FileSystemModal />],
      ['Emulator Settings', <EmulatorSettingsModal />],
      ['Import/Export', <ImportExportModal />],
      ['Legal', <LegalModal />],
      ['Login', <LoginModal />]
    ])('%s opens modal on click', async (title, expected) => {
      const setIsModalOpenSpy = vi.fn();
      const setModalContextSpy = vi.fn();
      const { useModalContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
        ...original(),
        setModalContent: setModalContextSpy,
        setIsModalOpen: setIsModalOpenSpy
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText(title);

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(setModalContextSpy).toHaveBeenCalledWith(expected);
      expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
    });

    it.each([
      ['Download Save', <DownloadSaveModal />],
      ['Manage Save States', <SaveStatesModal />],
      ['Manage Cheats', <CheatsModal />]
    ])(
      '%s opens modal on click with running emulator',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const {
          useModalContext: originalModal,
          useRunningContext: originalRunning
        } = await vi.importActual<typeof contextHooks>(
          '../../hooks/context.tsx'
        );

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
          ...originalRunning(),
          isRunning: true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );

    it('Load Local Rom opens modal on click when local roms are present', async () => {
      const setIsModalOpenSpy = vi.fn();
      const setModalContextSpy = vi.fn();
      const { useModalContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
        ...original(),
        setModalContent: setModalContextSpy,
        setIsModalOpen: setIsModalOpenSpy
      }));

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          getCurrentGameName: () => '/some_rom.gba',
          getCurrentAutoSaveStatePath: () => null,
          listRoms: () => ['some_rom.gba']
        } as GBAEmulator
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Load Local Rom');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(setModalContextSpy).toHaveBeenCalledWith(<LoadLocalRomModal />);
      expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
    });

    it('Load Local Rom renders as disabled', async () => {
      const { useRunningContext: originalRunning } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: false
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByRole('button', { name: 'Load Local Rom' });

      expect(menuNode).toBeInTheDocument();
      expect(menuNode).toBeDisabled();
    });

    it('Quick Reload calls hook on click when running', async () => {
      const quickReloadSpy: () => void = vi.fn();
      const { useRunningContext: originalRunning } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      vi.spyOn(quickReloadHooks, 'useQuickReload').mockImplementation(() => ({
        quickReload: quickReloadSpy,
        isQuickReloadAvailable: true
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Quick Reload');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(quickReloadSpy).toHaveBeenCalledOnce();
    });

    it('Quick Reload renders as disabled', async () => {
      const { useRunningContext: originalRunning } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: false
      }));

      vi.spyOn(quickReloadHooks, 'useQuickReload').mockImplementation(() => ({
        quickReload: vi.fn(),
        isQuickReloadAvailable: false
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByRole('button', { name: 'Quick Reload' });

      expect(menuNode).toBeDisabled();
    });

    it('Screenshot calls emulator screenshot and toasts on success', async () => {
      const screenshotSpy: (fileName: string) => boolean = vi.fn(() => true);
      const {
        useEmulatorContext: originalEmulator,
        useRunningContext: originalRunning
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          screenshot: screenshotSpy,
          getCurrentGameName: () => '/some_rom.gba',
          getCurrentAutoSaveStatePath: () => null,
          listRoms: () => ['some_rom.gba']
        } as GBAEmulator,
        canvas: {} as HTMLCanvasElement
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Screenshot');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(screenshotSpy).toHaveBeenCalledOnce();
      expect(toastSuccessSpy).toHaveBeenCalledWith(
        'Screenshot saved successfully'
      );
    });

    it('Screenshot calls emulator screenshot and toasts on failure', async () => {
      const {
        useEmulatorContext: originalEmulator,
        useRunningContext: originalRunning
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          screenshot: () => false,
          getCurrentGameName: () => '/some_rom.gba',
          getCurrentAutoSaveStatePath: () => null,
          listRoms: () => ['some_rom.gba']
        } as GBAEmulator,
        canvas: {} as HTMLCanvasElement
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Screenshot');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(toastErrorSpy).toHaveBeenCalledWith('Screenshot has failed');
    });

    it('Full Screen requests canvas full screen on click when running', async () => {
      const requestFullScreenSpy: () => Promise<void> = vi.fn(() =>
        Promise.resolve(undefined)
      );
      const {
        useEmulatorContext: originalEmulator,
        useRunningContext: originalRunning
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        canvas: {
          requestFullscreen: requestFullScreenSpy
        } as HTMLCanvasElement
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Full Screen');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(requestFullScreenSpy).toHaveBeenCalledOnce();
    });

    it('Full Screen toasts on exception', async () => {
      const requestFullScreenSpy: () => Promise<void> = vi.fn(() =>
        Promise.reject(new Error(''))
      );
      const {
        useEmulatorContext: originalEmulator,
        useRunningContext: originalRunning
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        canvas: {
          requestFullscreen: requestFullScreenSpy
        } as HTMLCanvasElement
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Full Screen');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Full screen request has failed'
      );
    });

    it('Logout fires logout request with authentication', async () => {
      const executeLogoutSpy = vi.fn();
      const { useAuthContext: originalAuth } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
        ...originalAuth(),
        isAuthenticated: () => true
      }));

      vi.spyOn(logoutHooks, 'useLogout').mockReturnValue({
        isPending: false,
        error: null,
        mutate: executeLogoutSpy as UseMutateFunction<
          void,
          Error,
          void,
          unknown
        >
      } as UseMutationResult<void, Error, void, unknown>);

      renderWithContext(<NavigationMenu />);

      const menuNode = screen.getByText('Logout');

      expect(menuNode).toBeInTheDocument();

      await userEvent.click(menuNode);

      expect(executeLogoutSpy).toHaveBeenCalledOnce();
    });

    it.each([
      ['Load Save (Server)', <LoadSaveModal />],
      ['Load Rom (Server)', <LoadRomModal />]
    ])(
      '%s opens modal on click with authentication',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const { useModalContext: originalModal, useAuthContext: originalAuth } =
          await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
          ...originalAuth(),
          isAuthenticated: () => true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );

    it.each([
      ['Send Save to Server', <UploadSaveToServerModal />],
      ['Send Rom to Server', <UploadRomToServerModal />]
    ])(
      '%s opens modal on click with authentication and running emulator',
      async (title, expected) => {
        const setIsModalOpenSpy = vi.fn();
        const setModalContextSpy = vi.fn();
        const {
          useModalContext: originalModal,
          useAuthContext: originalAuth,
          useRunningContext: originalRunning
        } = await vi.importActual<typeof contextHooks>(
          '../../hooks/context.tsx'
        );

        vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
          ...originalModal(),
          setModalContent: setModalContextSpy,
          setIsModalOpen: setIsModalOpenSpy
        }));

        vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
          ...originalAuth(),
          isAuthenticated: () => true
        }));

        vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
          ...originalRunning(),
          isRunning: true
        }));

        renderWithContext(<NavigationMenu />);

        const menuNode = screen.getByText(title);

        expect(menuNode).toBeInTheDocument();

        await userEvent.click(menuNode);

        expect(setModalContextSpy).toHaveBeenCalledWith(expected);
        expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
      }
    );
  });

  describe('menu button', () => {
    const initialPos = {
      clientX: 0,
      clientY: 0
    };
    const movements = [
      { clientX: 0, clientY: 220 },
      { clientX: 0, clientY: 120 }
    ];

    it('sets layout on drag', async () => {
      const setLayoutSpy = vi.fn();
      const { useLayoutContext: originalLayout, useDragContext: originalDrag } =
        await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useDragContext').mockImplementation(() => ({
        ...originalDrag(),
        areItemsDraggable: true
      }));

      vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
        ...originalLayout(),
        setLayout: setLayoutSpy
      }));

      renderWithContext(<NavigationMenu />);

      fireEvent.mouseDown(screen.getByLabelText('Menu Toggle'), initialPos);
      fireEvent.mouseMove(document, movements[0]);
      fireEvent.mouseUp(document, movements[1]);

      expect(setLayoutSpy).toHaveBeenCalledOnce();
      expect(setLayoutSpy).toHaveBeenCalledWith('menuButton', {
        position: {
          x: movements[1].clientX,
          y: movements[1].clientY
        },
        standalone: true
      });
    });

    it('renders with existing layout', () => {
      localStorage.setItem(
        'componentLayoutsV2',
        `{
          "menuButton": {
            "portrait": {
              "position": { "x": 0, "y": 200 },
              "orientation": "UNKNOWN",
              "isLargerThanPhone": false
            } 
          }
        }`
      );

      renderWithContext(<NavigationMenu />);

      expect(screen.getByLabelText('Menu Toggle')).toHaveStyle({
        transform: 'translate(0px,200px)'
      });
    });
  });
});
