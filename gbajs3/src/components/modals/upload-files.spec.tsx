import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadFilesModal } from './upload-files.tsx';
import { testRomLocation } from '../../../test/mocks/handlers.ts';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import {
  fileTypes,
  type FileTypes,
  type GBAEmulator
} from '../../emulator/mgba/mgba-emulator.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import * as writeFileHooks from '../../hooks/emulator/use-write-file-to-emulator.tsx';

describe('<UploadFilesModal />', () => {
  const emulatorForFiles: Partial<GBAEmulator> = {
    defaultFileTypes: () => fileTypes,
    isFileExtensionOfType: (fileName: string, type: keyof FileTypes) => {
      const fileExtension = `.${fileName.split('.').pop()}`;

      return fileTypes[type].some((e) =>
        typeof e === 'string' ? e === fileExtension : !!e.regex.exec(fileName)
      );
    },
    getCurrentAutoSaveStatePath: () => null
  };

  it('uploads local files and closes modal', async () => {
    const { useEmulatorContext: originalEmu, useModalContext: originalModal } =
      await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    const setIsModalOpenSpy = vi.fn();
    const syncActionIfEnabledSpy = vi.fn();

    const writeFileToEmulatorSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmu(),
      emulator: emulatorForFiles as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(writeFileHooks, 'useWriteFileToEmulator').mockReturnValue(
      writeFileToEmulatorSpy
    );

    renderWithContext(<UploadFilesModal />);

    const fileInput = screen.getByTestId('hidden-file-input');

    const files = [
      new File(['aaa'], 'rom1.gba'),
      new File(['bbb'], 'rom1.sav')
    ];

    await userEvent.upload(fileInput, files);

    expect(screen.getByText('rom1.gba')).toBeVisible();
    expect(screen.getByText('rom1.sav')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(writeFileToEmulatorSpy).toHaveBeenCalledTimes(2);
    expect(writeFileToEmulatorSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: 'rom1.gba' })
    );
    expect(writeFileToEmulatorSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: 'rom1.sav' })
    );

    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('allows choosing which ROM to run (checkbox toggling)', async () => {
    const { useEmulatorContext: originalEmu } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmu(),
      emulator: emulatorForFiles as GBAEmulator
    }));

    renderWithContext(<UploadFilesModal />);

    const fileInput = screen.getByTestId('hidden-file-input');

    const files = [
      new File(['aaa'], 'rom1.gba'),
      new File(['bbb'], 'rom2.gb'),
      new File(['ccc'], 'rom3.sav')
    ];

    await userEvent.upload(fileInput, files);

    const first = screen.getByRole('checkbox', { name: 'Run rom1.gba' });
    const second = screen.getByRole('checkbox', { name: 'Run rom2.gb' });

    expect(first).toBeChecked();
    expect(second).not.toBeChecked();

    await userEvent.click(second);
    expect(first).not.toBeChecked();
    expect(second).toBeChecked();

    await userEvent.click(second);
    expect(first).not.toBeChecked();
    expect(second).not.toBeChecked();

    expect(
      screen.queryByRole('checkbox', { name: /run rom3\.sav/i })
    ).not.toBeInTheDocument();
  });

  it('submits a valid external rom URL and closes', async () => {
    const { useEmulatorContext: originalEmu, useModalContext: originalModal } =
      await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    const setIsModalOpenSpy = vi.fn();
    const syncActionIfEnabledSpy = vi.fn();
    const writeFileToEmulatorSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmu(),
      emulator: emulatorForFiles as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(writeFileHooks, 'useWriteFileToEmulator').mockReturnValue(
      writeFileToEmulatorSpy
    );

    renderWithContext(<UploadFilesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'urls' }));

    await userEvent.type(
      screen.getByLabelText('URL'),
      `${testRomLocation}/good_rom.gba`
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(writeFileToEmulatorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'good_rom.gba' }),
        'rom'
      )
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('respects selected URL file type', async () => {
    const { useEmulatorContext: originalEmu, useModalContext: originalModal } =
      await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    const setIsModalOpenSpy = vi.fn();
    const syncActionIfEnabledSpy = vi.fn();
    const writeFileToEmulatorSpy = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmu(),
      emulator: emulatorForFiles as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(writeFileHooks, 'useWriteFileToEmulator').mockReturnValue(
      writeFileToEmulatorSpy
    );

    renderWithContext(<UploadFilesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'urls' }));

    const fileTypeSelect = screen.getByRole('combobox');

    expect(fileTypeSelect).toBeVisible();

    await userEvent.click(fileTypeSelect);

    await userEvent.click(screen.getByRole('option', { name: 'save' }));

    expect(fileTypeSelect).toHaveTextContent('save');

    const urlInput = screen.getByRole('textbox', { name: 'URL' });
    await userEvent.type(urlInput, `${testRomLocation}/good_rom.gba`);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(writeFileToEmulatorSpy).toHaveBeenCalled());

    expect(writeFileToEmulatorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'good_rom.gba' }),
      'save'
    );
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('shows invalid URL validation error', async () => {
    renderWithContext(<UploadFilesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'urls' }));

    await userEvent.type(
      screen.getByLabelText('Upload File From URL'),
      'some invalid url'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Invalid url')).toBeVisible();
  });

  it('renders files validation error when there are no files', async () => {
    const { useEmulatorContext: originalEmu } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmu(),
      emulator: emulatorForFiles as GBAEmulator
    }));

    renderWithContext(<UploadFilesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      screen.getByText(
        "At least one '.gba', '.gbc', '.gb', '.zip', '.7z', '.ips', '.ups', '.bps', '_auto.ss', '.sav', '.ss', '.cheats', '.png' file is required"
      )
    ).toBeVisible();
  });

  it('allows adding and removing external URL rows', async () => {
    renderWithContext(<UploadFilesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'urls' }));

    const first = screen.getByLabelText('Upload File From URL');
    expect(first).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Add upload url' })
    );

    expect(screen.getAllByLabelText('Upload File From URL')).toHaveLength(2);

    const removeButton1 = screen.getByRole('button', {
      name: 'Remove URL 1'
    });
    await userEvent.click(removeButton1);

    expect(screen.getAllByLabelText('Upload File From URL')).toHaveLength(1);
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

    renderWithContext(<UploadFilesModal />);

    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });
});
