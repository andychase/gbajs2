import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadSavesModal } from './upload-saves.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadSavesModal />', () => {
  it('uploads file and closes modal', async () => {
    const uploadSaveOrSaveStateSpy: (file: File, cb?: () => void) => void =
      vi.fn((_file, cb) => cb && cb());
    const syncActionIfEnabledSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');
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

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    const testSaveFile = new File(['Some save file contents'], 'rom1.sav');

    renderWithContext(<UploadSavesModal />);

    const savesInput = screen.getByTestId('hidden-file-input');

    expect(savesInput).toBeInTheDocument();

    await userEvent.upload(savesInput, testSaveFile);

    expect(screen.getByText('File to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledOnce();
    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledWith(
      testSaveFile,
      expect.anything()
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('uploads multiple files and closes modal', async () => {
    const uploadSaveSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const syncActionIfEnabledSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadSaveOrSaveState: uploadSaveSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    const testSaveFiles = [
      new File(['Some save file contents 1'], 'rom1.sav'),
      new File(['Some save file contents 2'], 'rom2.sav')
    ];

    renderWithContext(<UploadSavesModal />);

    const savesInput = screen.getByTestId('hidden-file-input');

    expect(savesInput).toBeInTheDocument();

    await userEvent.upload(savesInput, testSaveFiles);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();
    expect(screen.getByText('rom2.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveSpy).toHaveBeenCalledTimes(2);
    expect(uploadSaveSpy).toHaveBeenCalledWith(
      testSaveFiles[0],
      expect.anything()
    );
    expect(uploadSaveSpy).toHaveBeenCalledWith(
      testSaveFiles[1],
      expect.anything()
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadSavesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/At least one .sav, or .ss file is required/)
    ).toBeVisible();
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

    renderWithContext(<UploadSavesModal />);

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

    renderWithContext(<UploadSavesModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop your save or save state files, or click to select files.'
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'The name of your files must match the name of your rom.'
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Save and save state files should have an extension '.sav' or start with '.ss'."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('You may drop or select multiple files!')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to drag and drop your save or save state files, or click to select files.'
      )
    ).toBeVisible();
    expect(
      await screen.findByText(
        'The name of your files must match the name of your rom.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        "Save and save state files should have an extension '.sav' or start with '.ss'."
      )
    ).toBeVisible();
    expect(
      screen.getByText('You may drop or select multiple files!')
    ).toBeVisible();

    // dismiss the popper interface
    await userEvent.click(screen.getByText('Last'));
  });
});
