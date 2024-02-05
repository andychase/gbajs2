import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadSavesModal } from './upload-saves.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadSavesModal />', () => {
  it('clicks file input when form is clicked', async () => {
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');

    renderWithContext(<UploadSavesModal />);

    await userEvent.click(
      screen.getByRole('presentation', { name: 'Upload Saves' })
    );

    expect(inputClickSpy).toHaveBeenCalledOnce();
  });

  it('uploads file', async () => {
    const uploadSaveOrSaveStateSpy: (file: File, cb?: () => void) => void =
      vi.fn((_file, cb) => cb && cb());

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy
      } as GBAEmulator
    }));

    const testSaveFile = new File(['Some save file contents'], 'rom1.sav');

    renderWithContext(<UploadSavesModal />);

    const savesInput = screen.getByTestId('savefiles-hidden-input');

    expect(savesInput).toBeInTheDocument();

    await userEvent.upload(savesInput, testSaveFile);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledOnce();
    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledWith(testSaveFile);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.sav')).not.toBeInTheDocument();
  });

  it('uploads multiple files', async () => {
    const uploadSaveSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadSaveOrSaveState: uploadSaveSpy
      } as GBAEmulator
    }));

    const testSaveFiles = [
      new File(['Some save file contents 1'], 'rom1.sav'),
      new File(['Some save file contents 2'], 'rom2.sav')
    ];

    renderWithContext(<UploadSavesModal />);

    const savesInput = screen.getByTestId('savefiles-hidden-input');

    expect(savesInput).toBeInTheDocument();

    await userEvent.upload(savesInput, testSaveFiles);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();
    expect(screen.getByText('rom2.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveSpy).toHaveBeenCalledTimes(2);
    expect(uploadSaveSpy).toHaveBeenCalledWith(testSaveFiles[0]);
    expect(uploadSaveSpy).toHaveBeenCalledWith(testSaveFiles[1]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.sav')).not.toBeInTheDocument();
    expect(screen.queryByText('rom2.sav')).not.toBeInTheDocument();
  });

  it('uploads file with drag and drop', async () => {
    const uploadSaveSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadSaveOrSaveState: uploadSaveSpy
      } as GBAEmulator
    }));

    const testSaveFiles = [new File(['Some save file contents'], 'rom1.sav')];
    const data = {
      dataTransfer: {
        testSaveFiles,
        items: testSaveFiles.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file
        })),
        types: ['Files']
      }
    };

    renderWithContext(<UploadSavesModal />);

    const uploadSaveOrSaveStateForm = screen.getByRole('presentation', {
      name: 'Upload Saves'
    });

    fireEvent.dragEnter(uploadSaveOrSaveStateForm, data);
    fireEvent.drop(uploadSaveOrSaveStateForm, data);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveSpy).toHaveBeenCalledOnce();
    expect(uploadSaveSpy).toHaveBeenCalledWith(testSaveFiles[0]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.sav')).not.toBeInTheDocument();
  });

  it('uploads multiple files with drag and drop', async () => {
    const uploadSaveSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadSaveOrSaveState: uploadSaveSpy
      } as GBAEmulator
    }));

    const testSaveFiles = [
      new File(['Some save file contents 1'], 'rom1.sav'),
      new File(['Some save file contents 2'], 'rom2.sav')
    ];

    const data = {
      dataTransfer: {
        testSaveFiles,
        items: testSaveFiles.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file
        })),
        types: ['Files']
      }
    };

    renderWithContext(<UploadSavesModal />);

    const uploadSaveOrSaveStateForm = screen.getByRole('presentation', {
      name: 'Upload Saves'
    });

    fireEvent.dragEnter(uploadSaveOrSaveStateForm, data);
    fireEvent.drop(uploadSaveOrSaveStateForm, data);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();
    expect(screen.getByText('rom2.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadSaveSpy).toHaveBeenCalledTimes(2);
    expect(uploadSaveSpy).toHaveBeenCalledWith(testSaveFiles[0]);
    expect(uploadSaveSpy).toHaveBeenCalledWith(testSaveFiles[1]);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('Files to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.sav')).not.toBeInTheDocument();
    expect(screen.queryByText('rom2.sav')).not.toBeInTheDocument();
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadSavesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/At least one .sav file is required/)
    ).toBeVisible();
  });

  it.each([
    ['rom1.sav', false],
    ['rom1.gba', true],
    ['', true]
  ])('validates input file name: %s', async (fileName, expectError) => {
    const testSave = new File(['Some save file contents'], fileName);

    renderWithContext(<UploadSavesModal />);

    const savesInput = screen.getByTestId('savefiles-hidden-input');

    expect(savesInput).toBeInTheDocument();

    await userEvent.upload(savesInput, testSave);

    expect(await screen.findByText('Files to upload:')).toBeVisible();
    if (fileName) expect(screen.getByText(fileName)).toBeVisible();

    if (expectError) {
      expect(
        screen.getByText(/At least one .sav file is required/)
      ).toBeVisible();
    } else {
      expect(
        screen.queryByText(/At least one .sav file is required/)
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
        'Use this area to drag and drop your save files, or click to select save files.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('You may drop or select multiple save files!')
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to drag and drop your save files, or click to select save files.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('You may drop or select multiple save files!')
    ).toBeVisible();
  });
});
