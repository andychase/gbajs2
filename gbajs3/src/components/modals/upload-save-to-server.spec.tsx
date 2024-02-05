import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadSaveToServerModal } from './upload-save-to-server.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as uploadSaveHooks from '../../hooks/use-upload-save.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadSaveToServerModal />', () => {
  it('uploads save to the server', async () => {
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        getCurrentSave: () =>
          new TextEncoder().encode('Some save file contents'),
        getCurrentSaveName: () => 'some_save.sav'
      } as GBAEmulator
    }));

    renderWithContext(<UploadSaveToServerModal />);

    expect(
      screen.getByText(
        'Are you sure you want to upload your current save file to the server?'
      )
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(screen.getByTestId('upload-save-spinner')).toBeVisible();

    await waitForElementToBeRemoved(
      screen.queryByTestId('upload-save-spinner')
    );

    expect(
      screen.getByText('Save file upload was successful!')
    ).toBeInTheDocument();
  });

  it('renders error message failure to upload', async () => {
    vi.spyOn(uploadSaveHooks, 'useUpLoadSave').mockReturnValue({
      data: null,
      isLoading: false,
      error: 'some error',
      execute: vi.fn()
    });

    renderWithContext(<UploadSaveToServerModal />);

    expect(screen.getByText('Save file upload has failed')).toBeInTheDocument();
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

    renderWithContext(<UploadSaveToServerModal />);

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

    renderWithContext(<UploadSaveToServerModal />);

    expect(
      await screen.findByText(
        'Use this button to upload your current save file to the server.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Remember to save in game before uploading!')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this button to upload your current save file to the server.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('Remember to save in game before uploading!')
    ).toBeVisible();
  });
});
