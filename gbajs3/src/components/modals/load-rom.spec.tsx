import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoadRomModal } from './load-rom.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import * as runGameHooks from '../../hooks/emulator/use-run-game.tsx';
import * as listRomHooks from '../../hooks/use-list-roms.tsx';
import * as loadRomHooks from '../../hooks/use-load-rom.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<LoadRomModal />', () => {
  it('renders with list of roms from the server', async () => {
    renderWithContext(<LoadRomModal />);

    expect(await screen.findByText('rom1.gba'));
    expect(await screen.findByText('rom2.gba'));
  });

  it('loads rom from the server', async () => {
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const runGameSpy = vi.fn();
    const syncActionIfEnabledSpy = vi.fn();
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        filePaths: () => ({
          gamePath: '/games'
        })
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    renderWithContext(<LoadRomModal />);

    expect(await screen.findByText('rom1.gba')).toBeInTheDocument();

    await userEvent.click(screen.getByText('rom1.gba'));

    const loadingSpinner = screen.getByText(/Loading rom:/);
    expect(loadingSpinner).toBeVisible();
    expect(loadingSpinner).toHaveTextContent('rom1.gba');

    await waitForElementToBeRemoved(screen.queryByText(/Loading rom:/));

    expect(uploadRomSpy).toHaveBeenCalledOnce();
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('/games/rom1.gba');
  });

  it('renders message when there are no roms', () => {
    vi.spyOn(listRomHooks, 'useListRoms').mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      execute: vi.fn()
    });

    renderWithContext(<LoadRomModal />);

    expect(
      screen.getByText(
        'No roms on the server, load a game and send your rom to the server'
      )
    ).toBeVisible();
  });

  it('renders error message failure to list roms', () => {
    vi.spyOn(listRomHooks, 'useListRoms').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<LoadRomModal />);

    expect(screen.getByText('Listing roms has failed')).toBeVisible();
  });

  it('renders error message failure to load rom', () => {
    vi.spyOn(loadRomHooks, 'useLoadRom').mockReturnValue({
      data: null,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<LoadRomModal />);

    expect(screen.getByText('Loading rom has failed')).toBeVisible();
  });

  it('closes modal using the close button', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(<LoadRomModal />);

    // click the close button
    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders tour steps', async () => {
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      isModalOpen: true
    }));

    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );

    renderWithContext(<LoadRomModal />);

    expect(
      await screen.findByText(
        'Use this area to load rom files from the server. Once the list has loaded, click a row to load the rom.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'You may load one rom file at a time, once the rom has loaded your game will boot!'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to load rom files from the server. Once the list has loaded, click a row to load the rom.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'You may load one rom file at a time, once the rom has loaded your game will boot!'
      )
    ).toBeVisible();
  });
});
