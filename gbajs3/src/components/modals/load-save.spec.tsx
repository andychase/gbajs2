import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoadSaveModal } from './load-save.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import * as listSaveHooks from '../../hooks/use-list-saves.tsx';
import * as loadSaveHooks from '../../hooks/use-load-save.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<LoadSaveModal />', () => {
  it('renders with list of saves from the server', async () => {
    renderWithContext(<LoadSaveModal />);

    expect(await screen.findByText('save1.sav'));
    expect(await screen.findByText('save2.sav'));
  });

  it('loads save from the server', async () => {
    const uploadSaveOrSaveStateSpy: (file: File, cb?: () => void) => void =
      vi.fn((_file, cb) => cb && cb());
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
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<LoadSaveModal />);

    expect(await screen.findByText('save1.sav')).toBeInTheDocument();

    await userEvent.click(screen.getByText('save1.sav'));

    const loadingSpinner = screen.getByText(/Loading save:/);
    expect(loadingSpinner).toBeVisible();
    expect(loadingSpinner).toHaveTextContent('save1.sav');

    await waitForElementToBeRemoved(screen.queryByText(/Loading save:/));

    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledOnce();
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
  });

  it('renders message when there are no saves', () => {
    vi.spyOn(listSaveHooks, 'useListSaves').mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      execute: vi.fn()
    });

    renderWithContext(<LoadSaveModal />);

    expect(
      screen.getByText(
        'No saves on the server, load a game and send your save to the server'
      )
    ).toBeVisible();
  });

  it('renders error message failure to list saves', () => {
    vi.spyOn(listSaveHooks, 'useListSaves').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<LoadSaveModal />);

    expect(screen.getByText('Listing saves has failed')).toBeVisible();
  });

  it('renders error message failure to load save', () => {
    vi.spyOn(loadSaveHooks, 'useLoadSave').mockReturnValue({
      data: null,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<LoadSaveModal />);

    expect(screen.getByText('Loading save has failed')).toBeVisible();
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

    renderWithContext(<LoadSaveModal />);

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

    renderWithContext(<LoadSaveModal />);

    expect(
      await screen.findByText(
        'Use this area to load save files from the server. Once the list has loaded, click a row to load the save.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('You may load multiple save files in a row!')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to load save files from the server. Once the list has loaded, click a row to load the save.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('You may load multiple save files in a row!')
    ).toBeVisible();

    // dismiss the popper interface
    await userEvent.click(screen.getByText('Last'));
  });
});
