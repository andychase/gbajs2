import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadPatchesModal } from './upload-patches.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadPatchesModal />', () => {
  it('uploads file and closes modal', async () => {
    const uploadPatchSpy: (file: File, cb?: () => void) => void = vi.fn(
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
        uploadPatch: uploadPatchSpy
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

    const testPatchFile = new File(['Some patch file contents'], 'rom1.ips');

    renderWithContext(<UploadPatchesModal />);

    const patchInput = screen.getByTestId('hidden-file-input');

    expect(patchInput).toBeInTheDocument();

    await userEvent.upload(patchInput, testPatchFile);

    expect(screen.getByText('File to upload:')).toBeVisible();
    expect(screen.getByText('rom1.ips')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadPatchSpy).toHaveBeenCalledOnce();
    expect(uploadPatchSpy).toHaveBeenCalledWith(
      testPatchFile,
      expect.anything()
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('uploads multiple files and closes modal', async () => {
    const uploadPatchSpy: (file: File, cb?: () => void) => void = vi.fn(
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
        uploadPatch: uploadPatchSpy
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

    const testPatchFiles = [
      new File(['Some patch file contents 1'], 'rom1.ips'),
      new File(['Some patch file contents 2'], 'rom2.ips')
    ];

    renderWithContext(<UploadPatchesModal />);

    const patchInput = screen.getByTestId('hidden-file-input');

    expect(patchInput).toBeInTheDocument();

    await userEvent.upload(patchInput, testPatchFiles);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.ips')).toBeVisible();
    expect(screen.getByText('rom2.ips')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadPatchSpy).toHaveBeenCalledTimes(2);
    expect(uploadPatchSpy).toHaveBeenCalledWith(
      testPatchFiles[0],
      expect.anything()
    );
    expect(uploadPatchSpy).toHaveBeenCalledWith(
      testPatchFiles[1],
      expect.anything()
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadPatchesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/At least one .ips\/.ups\/.bps file is required/)
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

    renderWithContext(<UploadPatchesModal />);

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

    renderWithContext(<UploadPatchesModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop .ips/.ups/.bps patch files, or click to select files.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The name of your patch files must match the name of your rom.'
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
        'Use this area to drag and drop .ips/.ups/.bps patch files, or click to select files.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'The name of your patch files must match the name of your rom.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('You may drop or select multiple files!')
    ).toBeVisible();
  });
});
