import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadCheatsModal } from './upload-cheats.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadCheatsModal />', () => {
  it('clicks file input when form is clicked', async () => {
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');

    renderWithContext(<UploadCheatsModal />);

    await userEvent.click(
      screen.getByRole('presentation', { name: 'Upload Cheats' })
    );

    expect(inputClickSpy).toHaveBeenCalledOnce();
  });

  it('uploads file', async () => {
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadCheats: uploadCheatsSpy
      } as GBAEmulator
    }));

    const testCheatFile = new File(['Some cheat file contents'], 'rom1.cheats');

    renderWithContext(<UploadCheatsModal />);

    const cheatsInput = screen.getByTestId('cheatfiles-hidden-input');

    expect(cheatsInput).toBeInTheDocument();

    await userEvent.upload(cheatsInput, testCheatFile);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.cheats')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadCheatsSpy).toHaveBeenCalledOnce();
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFile);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.cheats')).not.toBeInTheDocument();
  });

  it('uploads multiple files', async () => {
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadCheats: uploadCheatsSpy
      } as GBAEmulator
    }));

    const testCheatFiles = [
      new File(['Some cheat file contents 1'], 'rom1.cheats'),
      new File(['Some cheat file contents 2'], 'rom2.cheats')
    ];

    renderWithContext(<UploadCheatsModal />);

    const cheatsInput = screen.getByTestId('cheatfiles-hidden-input');

    expect(cheatsInput).toBeInTheDocument();

    await userEvent.upload(cheatsInput, testCheatFiles);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.cheats')).toBeVisible();
    expect(screen.getByText('rom2.cheats')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadCheatsSpy).toHaveBeenCalledTimes(2);
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFiles[0]);
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFiles[1]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.cheats')).not.toBeInTheDocument();
    expect(screen.queryByText('rom2.cheats')).not.toBeInTheDocument();
  });

  it('uploads file with drag and drop', async () => {
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadCheats: uploadCheatsSpy
      } as GBAEmulator
    }));

    const testCheatFiles = [
      new File(['Some cheat file contents'], 'rom1.cheats')
    ];
    const data = {
      dataTransfer: {
        testCheatFiles,
        items: testCheatFiles.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file
        })),
        types: ['Files']
      }
    };

    renderWithContext(<UploadCheatsModal />);

    const uploadCheatsForm = screen.getByRole('presentation', {
      name: 'Upload Cheats'
    });

    fireEvent.dragEnter(uploadCheatsForm, data);
    fireEvent.drop(uploadCheatsForm, data);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.cheats')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadCheatsSpy).toHaveBeenCalledOnce();
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFiles[0]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.cheats')).not.toBeInTheDocument();
  });

  it('uploads multiple files with drag and drop', async () => {
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadCheats: uploadCheatsSpy
      } as GBAEmulator
    }));

    const testCheatFiles = [
      new File(['Some cheat file contents 1'], 'rom1.cheats'),
      new File(['Some cheat file contents 2'], 'rom2.cheats')
    ];

    const data = {
      dataTransfer: {
        testCheatFiles,
        items: testCheatFiles.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file
        })),
        types: ['Files']
      }
    };

    renderWithContext(<UploadCheatsModal />);

    const uploadCheatsForm = screen.getByRole('presentation', {
      name: 'Upload Cheats'
    });

    fireEvent.dragEnter(uploadCheatsForm, data);
    fireEvent.drop(uploadCheatsForm, data);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.cheats')).toBeVisible();
    expect(screen.getByText('rom2.cheats')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadCheatsSpy).toHaveBeenCalledTimes(2);
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFiles[0]);
    expect(uploadCheatsSpy).toHaveBeenCalledWith(testCheatFiles[1]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.cheats')).not.toBeInTheDocument();
    expect(screen.queryByText('rom2.cheats')).not.toBeInTheDocument();
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadCheatsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/At least one .cheats file is required/)
    ).toBeVisible();
  });

  it.each([
    ['rom1.cheats', false],
    ['rom1.sav', true],
    ['', true]
  ])('validates input file name: %s', async (fileName, expectError) => {
    const testRom = new File(['Some cheat file contents'], fileName);

    renderWithContext(<UploadCheatsModal />);

    const cheatsInput = screen.getByTestId('cheatfiles-hidden-input');

    expect(cheatsInput).toBeInTheDocument();

    await userEvent.upload(cheatsInput, testRom);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    if (fileName) expect(screen.getByText(fileName)).toBeVisible();

    if (expectError) {
      expect(
        screen.getByText(/At least one .cheats file is required/)
      ).toBeVisible();
    } else {
      expect(
        screen.queryByText(/At least one .cheats file is required/)
      ).not.toBeInTheDocument();
    }
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

    renderWithContext(<UploadCheatsModal />);

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

    renderWithContext(<UploadCheatsModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop your cheat files, or click to select files.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cheat files should be in libretro format and have the extension '.cheats'."
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
        'Use this area to drag and drop your cheat files, or click to select files.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        "Cheat files should be in libretro format and have the extension '.cheats'."
      )
    ).toBeVisible();
    expect(
      screen.getByText('You may drop or select multiple files!')
    ).toBeVisible();
  });
});
