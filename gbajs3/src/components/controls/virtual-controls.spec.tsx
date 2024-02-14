import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import * as toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  saveStateSlotLocalStorageKey,
  virtualControlsLocalStorageKey
} from './consts.tsx';
import { VirtualControls } from './virtual-controls.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import { GbaDarkTheme } from '../../context/theme/theme.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { UploadSaveToServerModal } from '../modals/upload-save-to-server.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<VirtualControls />', () => {
  beforeEach(async () => {
    const { useLayoutContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...original(),
      layouts: {
        ...original().layouts,
        controlPanel: { initialBounds: { left: 0, bottom: 0 } as DOMRect }
      }
    }));
  });

  it('renders dpad and default virtual controls on mobile', () => {
    renderWithContext(<VirtualControls />);

    expect(screen.getByLabelText('A Button')).toBeVisible();
    expect(screen.getByLabelText('B Button')).toBeVisible();
    expect(screen.getByLabelText('Start Button')).toBeVisible();
    expect(screen.getByLabelText('Select Button')).toBeVisible();
    expect(screen.getByLabelText('L Button')).toBeVisible();
    expect(screen.getByLabelText('R Button')).toBeVisible();
    expect(screen.getByLabelText('O-Pad')).toBeVisible();
  });

  it('renders no virtual controls by default on desktop', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === GbaDarkTheme.isLargerThanPhone,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      onchange: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    }));

    renderWithContext(<VirtualControls />);

    expect(screen.queryByLabelText('A Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('B Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Start Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('L Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('R Button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('O-Pad')).not.toBeInTheDocument();
  });

  describe('Additional Controls', () => {
    beforeEach(() => {
      localStorage.setItem(
        virtualControlsLocalStorageKey,
        '{"DPadAndButtons":true,"SaveState":true,"LoadState":true,"QuickReload":true,"SendSaveToServer":true}'
      );
    });

    it('quick reloads game', async () => {
      const quickReloadSpy: () => void = vi.fn();
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          quickReload: quickReloadSpy,
          getCurrentGameName: () => 'some_rom.gba'
        } as GBAEmulator
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Quickreload Button'));

      expect(quickReloadSpy).toHaveBeenCalledOnce();
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });

    it('quick reload renders error toast', async () => {
      const quickReloadSpy: () => void = vi.fn();
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          quickReload: quickReloadSpy,
          getCurrentGameName: () => undefined
        } as GBAEmulator
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Quickreload Button'));

      expect(quickReloadSpy).toHaveBeenCalledOnce();
      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Load a game to quick reload',
        { id: expect.anything() }
      );
    });

    it('upload save opens modal if authenticated and running a game', async () => {
      const setIsModalOpenSpy = vi.fn();
      const setModalContextSpy = vi.fn();
      const {
        useAuthContext: originalAuth,
        useEmulatorContext: originalEmulator,
        useModalContext: originalContext
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
        ...originalAuth(),
        isAuthenticated: () => true
      }));

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true
      }));

      vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
        ...originalContext(),
        setModalContent: setModalContextSpy,
        setIsModalOpen: setIsModalOpenSpy
      }));

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Uploadsave Button'));

      expect(setModalContextSpy).toHaveBeenCalledWith(
        <UploadSaveToServerModal />
      );
      expect(setIsModalOpenSpy).toHaveBeenCalledWith(true);
    });

    it('upload save renders error toast', async () => {
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

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Uploadsave Button'));

      expect(toastErrorSpy).toHaveBeenCalledWith(
        'Please log in and load a game',
        { id: expect.anything() }
      );
      expect(setModalContextSpy).not.toHaveBeenCalled();
      expect(setIsModalOpenSpy).not.toHaveBeenCalled();
    });

    it('loads save state', async () => {
      const loadSaveStateSpy: (slot: number) => boolean = vi.fn(() => true);
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          loadSaveState: loadSaveStateSpy
        } as GBAEmulator
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      localStorage.setItem(saveStateSlotLocalStorageKey, '2');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Loadstate Button'));

      expect(loadSaveStateSpy).toHaveBeenCalledOnce();
      expect(loadSaveStateSpy).toHaveBeenCalledWith(2);
      expect(toastSuccessSpy).toHaveBeenCalledWith('Loaded slot: 2', {
        id: expect.anything()
      });
    });

    it('load save state renders error toast', async () => {
      const loadSaveStateSpy: (slot: number) => boolean = vi.fn(() => false);
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          loadSaveState: loadSaveStateSpy
        } as GBAEmulator
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      localStorage.setItem(saveStateSlotLocalStorageKey, '2');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Loadstate Button'));

      expect(loadSaveStateSpy).toHaveBeenCalledOnce();
      expect(loadSaveStateSpy).toHaveBeenCalledWith(2);
      expect(toastErrorSpy).toHaveBeenCalledWith('Failed to load slot: 2', {
        id: expect.anything()
      });
    });

    it('creates save state', async () => {
      const createSaveStateSpy: (slot: number) => boolean = vi.fn(() => true);
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          createSaveState: createSaveStateSpy
        } as GBAEmulator
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      localStorage.setItem(saveStateSlotLocalStorageKey, '2');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Savestate Button'));

      expect(createSaveStateSpy).toHaveBeenCalledOnce();
      expect(createSaveStateSpy).toHaveBeenCalledWith(2);
      expect(toastSuccessSpy).toHaveBeenCalledWith('Saved slot: 2', {
        id: expect.anything()
      });
    });

    it('create save state renders error toast', async () => {
      const createSaveStateSpy: (slot: number) => boolean = vi.fn(() => false);
      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: {
          createSaveState: createSaveStateSpy
        } as GBAEmulator
      }));

      const toastErrorSpy = vi.spyOn(toast.default, 'error');

      localStorage.setItem(saveStateSlotLocalStorageKey, '2');

      renderWithContext(<VirtualControls />);

      await userEvent.click(screen.getByLabelText('Savestate Button'));

      expect(createSaveStateSpy).toHaveBeenCalledOnce();
      expect(createSaveStateSpy).toHaveBeenCalledWith(2);
      expect(toastErrorSpy).toHaveBeenCalledWith('Failed to save slot: 2', {
        id: expect.anything()
      });
    });
  });
});
