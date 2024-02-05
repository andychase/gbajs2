import { fireEvent, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadRomModal } from './upload-rom.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadRomModal />', () => {
  it('clicks file input when form is clicked', async () => {
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');

    renderWithContext(<UploadRomModal />);

    await userEvent.click(
      screen.getByRole('presentation', { name: 'Upload Rom' })
    );

    expect(inputClickSpy).toHaveBeenCalledOnce();
  });

  it('uploads file and closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        run: emulatorRunSpy,
        filePaths: () => ({
          gamePath: '/games'
        })
      } as GBAEmulator
    }));

    const testRom = new File(['Some rom file contents'], 'rom1.gba');

    renderWithContext(<UploadRomModal />);

    const romInput = screen.getByTestId('romfile-hidden-input');

    expect(romInput).toBeInTheDocument();

    await userEvent.upload(romInput, testRom);

    expect(screen.getByText('File to upload:')).toBeVisible();
    expect(screen.getByText('rom1.gba')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadRomSpy).toHaveBeenCalledWith(testRom, expect.anything());

    expect(emulatorRunSpy).toHaveBeenCalledOnce();
    expect(emulatorRunSpy).toHaveBeenCalledWith('/games/rom1.gba');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('File to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.gba')).not.toBeInTheDocument();
  });

  it('uploads file with drag and drop', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        run: emulatorRunSpy,
        filePaths: () => ({
          gamePath: '/games'
        })
      } as GBAEmulator
    }));

    const testRoms = [new File(['Some rom file contents'], 'rom1.gba')];
    const data = {
      dataTransfer: {
        testRoms,
        items: testRoms.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file
        })),
        types: ['Files']
      }
    };

    renderWithContext(<UploadRomModal />);

    const uploadRomForm = screen.getByRole('presentation', {
      name: 'Upload Rom'
    });

    fireEvent.dragEnter(uploadRomForm, data);
    fireEvent.drop(uploadRomForm, data);

    expect(await screen.findByText('File to upload:')).toBeVisible();
    expect(screen.getByText('rom1.gba')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadRomSpy).toHaveBeenCalledWith(testRoms[0], expect.anything());

    expect(emulatorRunSpy).toHaveBeenCalledOnce();
    expect(emulatorRunSpy).toHaveBeenCalledWith('/games/rom1.gba');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);

    expect(screen.getByText('Upload complete!')).toBeVisible();
    expect(screen.queryByText('File to upload:')).not.toBeInTheDocument();
    expect(screen.queryByText('rom1.gba')).not.toBeInTheDocument();
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadRomModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/One .gba, .gbc, or .gb file is required/)
    ).toBeVisible();
  });

  it.each([
    ['rom1.gba', false],
    ['rom1.gbc', false],
    ['rom1 (1).gb', false],
    ['rom1.sav', true],
    ['rom1', true],
    ['', true]
  ])('validates input file name: %s', async (fileName, expectError) => {
    const testRom = new File(['Some rom file contents'], fileName);

    renderWithContext(<UploadRomModal />);

    const romInput = screen.getByTestId('romfile-hidden-input');

    expect(romInput).toBeInTheDocument();

    await userEvent.upload(romInput, testRom);

    expect(await screen.findByText('File to upload:')).toBeVisible();
    if (fileName) expect(screen.getByText(fileName)).toBeVisible();

    if (expectError) {
      expect(
        screen.getByText(/One .gba, .gbc, or .gb file is required/)
      ).toBeVisible();
    } else {
      expect(
        screen.queryByText(/One .gba, .gbc, or .gb file is required/)
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

    renderWithContext(<UploadRomModal />);

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

    renderWithContext(<UploadRomModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop your rom file, or click to select a rom file.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'You may drop or select one rom file at a time, once uploaded your game will boot!'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to drag and drop your rom file, or click to select a rom file.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'You may drop or select one rom file at a time, once uploaded your game will boot!'
      )
    ).toBeVisible();
  });
});
