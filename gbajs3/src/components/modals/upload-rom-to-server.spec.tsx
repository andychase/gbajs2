import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadRomToServerModal } from './upload-rom-to-server.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as uploadRomHooks from '../../hooks/use-upload-rom.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadRomToServerModal />', () => {
  it('uploads rom to the server', async () => {
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        getCurrentRom: () => new TextEncoder().encode('Some rom file contents'),
        getCurrentGameName: () => 'some_rom.gba'
      } as GBAEmulator
    }));

    renderWithContext(<UploadRomToServerModal />);

    expect(
      screen.getByText(
        'Are you sure you want to upload your current rom file to the server?'
      )
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(screen.getByTestId('upload-rom-spinner')).toBeVisible();

    await waitForElementToBeRemoved(screen.queryByTestId('upload-rom-spinner'));

    expect(
      screen.getByText('Rom file upload was successful!')
    ).toBeInTheDocument();
  });

  it('renders error message failure to upload', async () => {
    vi.spyOn(uploadRomHooks, 'useUpLoadRom').mockReturnValue({
      data: null,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<UploadRomToServerModal />);

    expect(screen.getByText('Rom file upload has failed')).toBeInTheDocument();
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

    renderWithContext(<UploadRomToServerModal />);

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

    renderWithContext(<UploadRomToServerModal />);

    expect(
      await screen.findByText(
        'Use this button to upload your current rom file to the server.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this button to upload your current rom file to the server.'
      )
    ).toBeVisible();
  });
});
