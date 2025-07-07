import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadRomsModal } from './upload-roms.tsx';
import { testRomLocation } from '../../../test/mocks/handlers.ts';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import * as runGameHooks from '../../hooks/emulator/use-run-game.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadRomsModal />', () => {
  it('uploads file and closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const syncActionIfEnabledSpy = vi.fn();
    const runGameSpy = vi.fn(() => true);

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    const testRom = new File(['Some rom file contents'], 'rom1.gba');

    renderWithContext(<UploadRomsModal />);

    const romInput = screen.getByTestId('hidden-file-input');

    expect(romInput).toBeInTheDocument();

    await userEvent.upload(romInput, testRom);

    expect(screen.getByText('File to upload:')).toBeVisible();
    expect(screen.getByText('rom1.gba')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadRomSpy).toHaveBeenCalledOnce();
    expect(uploadRomSpy).toHaveBeenCalledWith(testRom, expect.anything());

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('rom1.gba');
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('uploads multiple files, loads first file, and closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const syncActionIfEnabledSpy = vi.fn();
    const runGameSpy = vi.fn(() => true);

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
        uploadRom: uploadRomSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    const testRomFiles = [
      new File(['Some rom file contents 1'], 'rom1.gba'),
      new File(['Some rom file contents 2'], 'rom2.gba')
    ];

    renderWithContext(<UploadRomsModal />);

    const romInput = screen.getByTestId('hidden-file-input');

    expect(romInput).toBeInTheDocument();

    await userEvent.upload(romInput, testRomFiles);

    expect(screen.getByText('Files to upload:')).toBeVisible();
    expect(screen.getByText('rom1.gba')).toBeVisible();
    expect(screen.getByText('rom2.gba')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadRomSpy).toHaveBeenCalledTimes(2);
    expect(uploadRomSpy).toHaveBeenCalledWith(
      testRomFiles[0],
      expect.anything()
    );
    expect(uploadRomSpy).toHaveBeenCalledWith(
      testRomFiles[1],
      expect.anything()
    );

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('rom1.gba');

    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('uploads multiple files, loads selected file, and closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const syncActionIfEnabledSpy = vi.fn();
    const runGameSpy = vi.fn(() => true);

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
        uploadRom: uploadRomSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    const testRomFiles = [
      new File(['Some rom file contents 1'], 'rom1.gba'),
      new File(['Some rom file contents 2'], 'rom2.gba')
    ];

    renderWithContext(<UploadRomsModal />);

    const romInput = screen.getByTestId('hidden-file-input');

    expect(romInput).toBeInTheDocument();

    await userEvent.upload(romInput, testRomFiles);

    await userEvent.click(
      screen.getByLabelText('Run rom2.gba', { selector: 'input' })
    );
    expect(
      screen.getByLabelText('Run rom2.gba', { selector: 'input' })
    ).toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(uploadRomSpy).toHaveBeenCalledTimes(2);
    expect(uploadRomSpy).toHaveBeenCalledWith(
      testRomFiles[0],
      expect.anything()
    );
    expect(uploadRomSpy).toHaveBeenCalledWith(
      testRomFiles[1],
      expect.anything()
    );

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('rom2.gba');

    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('uploads rom from external url', async () => {
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const syncActionIfEnabledSpy = vi.fn();
    const runGameSpy = vi.fn(() => true);

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    // needs to be a consistent object
    const testEmu = {
      uploadRom: uploadRomSpy
    } as GBAEmulator;

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: testEmu
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    renderWithContext(<UploadRomsModal />);

    const uploadRomFromURLInput = screen.getByLabelText('Upload from a URL');

    await userEvent.type(
      uploadRomFromURLInput,
      `${testRomLocation}/good_rom.gba`
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const loadingSpinner = screen.getByText(/Loading rom from url:/);
    expect(loadingSpinner).toBeVisible();
    expect(loadingSpinner).toHaveTextContent(`${testRomLocation}/good_rom.gba`);

    await waitForElementToBeRemoved(
      screen.queryByText(/Loading rom from url:/)
    );

    expect(uploadRomSpy).toHaveBeenCalledOnce();

    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('good_rom.gba');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders external rom error', async () => {
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        run: emulatorRunSpy
      } as GBAEmulator
    }));

    renderWithContext(<UploadRomsModal />);

    const uploadRomFromURLInput = screen.getByLabelText('Upload from a URL');

    await userEvent.type(
      uploadRomFromURLInput,
      `${testRomLocation}/bad_rom.gba`
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const loadingSpinner = screen.getByText(/Loading rom from url:/);
    expect(loadingSpinner).toBeVisible();
    expect(loadingSpinner).toHaveTextContent(`${testRomLocation}/bad_rom.gba`);

    await waitForElementToBeRemoved(
      screen.queryByText(/Loading rom from url:/)
    );

    expect(uploadRomSpy).not.toHaveBeenCalled();
    expect(emulatorRunSpy).not.toHaveBeenCalled();

    expect(
      await screen.findByText('Loading rom from URL has failed')
    ).toBeVisible();
  });

  it('renders invalid url error', async () => {
    renderWithContext(<UploadRomsModal />);

    await userEvent.type(
      screen.getByLabelText('Upload from a URL'),
      `invalid url`
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(screen.getByText(/Invalid URL/)).toBeVisible();
  });

  it('renders form validation error', async () => {
    renderWithContext(<UploadRomsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(/At least one rom file or URL is required/)
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

    renderWithContext(<UploadRomsModal />);

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

    renderWithContext(<UploadRomsModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop roms or zipped rom files, or click to select files.'
      )
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Rom files should have an extension of: '.gba', '.gbc', '.gb', '.zip', '.7z'."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'You may drop or select multiple files, once uploaded the selected game will boot!'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to drag and drop roms or zipped rom files, or click to select files.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        "Rom files should have an extension of: '.gba', '.gbc', '.gb', '.zip', '.7z'."
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'You may drop or select multiple files, once uploaded the selected game will boot!'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        'Alternatively, you may load a rom file from an external URL.'
      )
    ).toBeVisible();

    // dismiss the popper interface
    await userEvent.click(screen.getByText('Last'));
  });
});
