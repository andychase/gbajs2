import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DownloadSaveModal } from './download-save.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<DownloadSaveModal />', () => {
  it('renders with reminder message', () => {
    renderWithContext(<DownloadSaveModal />);

    expect(
      screen.getByText(
        'Remember to save in game before downloading your save file!'
      )
    ).toBeVisible();
  });

  it('renders error if there is no current save or save name', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        getCurrentSave: () => null,
        getCurrentSaveName: () => undefined
      } as GBAEmulator
    }));

    renderWithContext(<DownloadSaveModal />);

    // click the download button
    const downloadButton = screen.getByText('Download', { selector: 'button' });
    await userEvent.click(downloadButton);

    expect(
      screen.getByText('Load a rom to download its save file')
    ).toBeVisible();
  });

  it('downloads save if there is a save and save name', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    // unimplemented in jsdom
    URL.createObjectURL = vi.fn(() => 'object_url:some_rom.sav');
    URL.revokeObjectURL = vi.fn();
    // mock to assert click and prevent navigation (unimplemented)
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockReturnValue();
    const anchorRemoveSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        getCurrentSave: () =>
          new TextEncoder().encode('Some sav file contents'),
        getCurrentSaveName: () => 'some_rom.sav'
      } as GBAEmulator
    }));

    renderWithContext(<DownloadSaveModal />);

    // click the download button
    const downloadButton = screen.getByText('Download', { selector: 'button' });
    await userEvent.click(downloadButton);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.anything());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      expect.stringMatching(/object_url:some_rom\.sav$/)
    );
    expect(anchorClickSpy).toHaveBeenCalledOnce();
    expect(anchorRemoveSpy).toHaveBeenCalledOnce();
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

    renderWithContext(<DownloadSaveModal />);

    // click the close button
    const closeButton = screen.getByText('Close', { selector: 'button' });
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

    renderWithContext(<DownloadSaveModal />);

    expect(
      await screen.findByText(
        'Use this button to download your current save file.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Remember to save in game before downloading!')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText('Use this button to download your current save file.')
    ).toBeVisible();
    expect(
      screen.getByText('Remember to save in game before downloading!')
    ).toBeVisible();
  });
});
