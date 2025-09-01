import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  BlobWriter,
  TextReader,
  ZipWriter,
  ZipReader,
  Uint8ArrayWriter,
  Uint8ArrayReader,
  type Entry,
  type FileEntry
} from '@zip.js/zip.js';
import { describe, expect, it, vi } from 'vitest';

import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';
import * as zipUtils from './file-utilities/zip.ts';
import { ImportExportModal } from './import-export.tsx';

import type {
  GBAEmulator,
  FileNode
} from '../../emulator/mgba/mgba-emulator.tsx';

type GenericFileUploadSpy = (_file: File, _cb?: () => void) => void;

describe('<ImportExportModal />', () => {
  const defaultFSData: FileNode = {
    path: '/data',
    isDir: true,
    children: [
      {
        path: '/data/games',
        isDir: true,
        children: [
          {
            path: '/data/games/rom1.gba',
            isDir: false,
            children: []
          }
        ]
      },
      {
        path: '/data/saves',
        isDir: true,
        children: [
          {
            path: '/data/games/rom1.sav',
            isDir: false,
            children: []
          }
        ]
      }
    ],
    nextNeighbor: {
      path: '/autosave',
      isDir: true,
      children: [{ path: '/autosave/rom1_auto.ss', isDir: false, children: [] }]
    }
  };

  // only uint8 array style (no blobs) will work in jsdom
  const makeEntries = async (
    items: Array<{ name: string; data?: string; directory?: boolean }>
  ): Promise<Entry[]> => {
    const u8w = new Uint8ArrayWriter();
    const zw = new ZipWriter(u8w);
    for (const { name, data, directory } of items) {
      await zw.add(
        name.endsWith('/') ? name : directory ? `${name}/` : name,
        directory ? undefined : new TextReader(data ?? '')
      );
    }
    const bytes = await zw.close();
    const zr = new ZipReader(new Uint8ArrayReader(bytes));
    const entries = await zr.getEntries();
    await zr.close();
    return entries;
  };

  it('renders form validation error when submitting without a file', async () => {
    renderWithContext(<ImportExportModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      screen.getByText(/At least one export \.zip file is required/i)
    ).toBeVisible();
  });

  it('imports a zip and closes modal', async () => {
    const syncActionIfEnabledSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();
    const readZipSpy = vi
      .spyOn(zipUtils, 'readZipEntriesFromBlob')
      .mockImplementation(async (_, onEntry) => {
        const entries = await makeEntries([
          { name: 'rom1.gba', data: 'test-rom1' }
        ]);
        for (const e of entries) await onEntry(e);
      });

    const { useModalContext: originalModal } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    const testZip = new File(['dummy'], 'export.zip', {
      type: 'application/zip'
    });

    renderWithContext(<ImportExportModal />);

    const hiddenInput = screen.getByTestId('hidden-file-input');
    expect(hiddenInput).toBeInTheDocument();

    await userEvent.upload(hiddenInput, testZip);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(readZipSpy).toHaveBeenCalledOnce();
    expect(readZipSpy).toHaveBeenCalledWith(testZip, expect.any(Function));
    await waitFor(() => expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce());
    await waitFor(() => expect(setIsModalOpenSpy).toHaveBeenCalledWith(false));
  });

  it('dispatches imported entries to the correct emulator APIs', async () => {
    const uploadRomSpy = vi.fn();
    const uploadAutoSaveStateSpy = vi.fn(async () => undefined);
    const uploadSaveOrSaveStateSpy = vi.fn();
    const uploadCheatsSpy = vi.fn();
    const uploadPatchSpy = vi.fn();
    const uploadScreenshotSpy = vi.fn();

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
        uploadAutoSaveState: uploadAutoSaveStateSpy as (
          autoSaveStateName: string,
          data: Uint8Array
        ) => Promise<void>,
        uploadRom: uploadRomSpy as GenericFileUploadSpy,
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy as GenericFileUploadSpy,
        uploadCheats: uploadCheatsSpy as GenericFileUploadSpy,
        uploadPatch: uploadPatchSpy as GenericFileUploadSpy,
        uploadScreenshot: uploadScreenshotSpy as GenericFileUploadSpy,
        filePaths: () => ({ autosave: '/autosave' }),
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy,
      getCurrentAutoSaveStatePath: () => null
    }));

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const restoreLocalStorageFromZipSpy = vi.spyOn(
      zipUtils,
      'restoreLocalStorageFromZip'
    );

    vi.spyOn(zipUtils, 'readZipEntriesFromBlob').mockImplementation(
      async (_file: File, onEntry: (e: Entry) => Promise<void>) => {
        const entries = await makeEntries([
          { name: 'rom.gba' },
          { name: 'rom.gbc' },
          { name: 'rom.gb' },
          { name: 'rom.zip' },
          { name: 'rom.7z' },
          { name: 'state_auto.ss' },
          { name: 'data.sav' },
          { name: 'save.ss2' },
          { name: 'rules.cheats' },
          { name: 'patch.ips' },
          { name: 'patch.ups' },
          { name: 'patch.bps' },
          { name: 'screenshot.png' },
          { name: 'local-storage.json', data: '{"some-key":"some-value"}' },
          { name: '../evil.txt' }, // unsafe
          { name: 'invalid.txt' }, // no write path
          { name: 'some/dir/', directory: true } // directory -> skipped
        ]);
        for (const e of entries) await onEntry(e);
      }
    );

    vi.spyOn(zipUtils, 'readFileFromZipEntry').mockImplementation(
      async (entry: FileEntry) => new File(['bytes'], entry.filename)
    );

    const testZip = new File(['zip-bytes'], 'export.zip', {
      type: 'application/zip'
    });

    renderWithContext(<ImportExportModal />);

    await userEvent.upload(screen.getByTestId('hidden-file-input'), testZip);
    await userEvent.click(screen.getByRole('button', { name: 'Import' }));

    await waitFor(() => expect(uploadRomSpy).toHaveBeenCalledTimes(5));

    expect(uploadAutoSaveStateSpy).toHaveBeenCalledTimes(1);

    expect(uploadSaveOrSaveStateSpy).toHaveBeenCalledTimes(2);

    expect(uploadCheatsSpy).toHaveBeenCalledTimes(1);

    expect(uploadPatchSpy).toHaveBeenCalledTimes(3);

    expect(uploadScreenshotSpy).toHaveBeenCalledTimes(1);

    expect(restoreLocalStorageFromZipSpy).toHaveBeenCalledTimes(1);

    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('exports emulator file system to a zip', async () => {
    vi.setSystemTime(Date.UTC(2025, 0, 1, 8, 0, 0));

    const finalizeSpy = vi.fn();
    const generateExportZipNameSpy = vi.spyOn(
      zipUtils,
      'generateExportZipName'
    );
    const setupZipTargetSpy = vi
      .spyOn(zipUtils, 'setupZipTarget')
      .mockImplementation(async () => ({
        writer: new ZipWriter<Blob>(new BlobWriter('application/zip')),
        finalize: finalizeSpy
      }));
    const addUint8ArrayToZipSpy = vi.spyOn(zipUtils, 'addUint8ArrayToZip');
    const addLocalStorageToZipSpy = vi.spyOn(zipUtils, 'addLocalStorageToZip');
    const listAllFilesSpy: () => FileNode = vi.fn(
      (): FileNode => defaultFSData
    );
    const getFileSpy: (p: string) => Uint8Array = vi.fn(() =>
      new TextEncoder().encode('Some sav file contents')
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        listAllFiles: listAllFilesSpy,
        getFile: getFileSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<ImportExportModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(generateExportZipNameSpy).toHaveBeenCalledOnce();
    expect(setupZipTargetSpy).toHaveBeenCalledWith(
      'gbajs-files-2025-01-01-08-00-00.zip',
      zipUtils.zipOptions
    );

    await waitFor(() => expect(finalizeSpy).toHaveBeenCalledOnce());

    expect(addUint8ArrayToZipSpy).toHaveBeenCalledTimes(3);

    expect(addUint8ArrayToZipSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(ZipWriter<void | Blob>),
      'autosave/rom1_auto.ss',
      expect.anything()
    );

    expect(zipUtils.addUint8ArrayToZip).toHaveBeenNthCalledWith(
      2,
      expect.any(ZipWriter<void | Blob>),
      'data/games/rom1.gba',
      expect.anything()
    );

    expect(zipUtils.addUint8ArrayToZip).toHaveBeenNthCalledWith(
      3,
      expect.any(ZipWriter<void | Blob>),
      'data/games/rom1.sav',
      expect.anything()
    );

    expect(addLocalStorageToZipSpy).toHaveBeenCalledOnce();
  });

  it('closes modal when clicking Close', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(<ImportExportModal />);

    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();

    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders product tour steps', async () => {
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

    renderWithContext(<ImportExportModal />);

    expect(
      await screen.findByText(
        'Use this area to drag and drop the exported zip file, or click to select a file.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Uploaded exports should have an extension of: '.zip'.")
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to drag and drop the exported zip file, or click to select a file.'
      )
    ).toBeVisible();
    expect(
      screen.getByText("Uploaded exports should have an extension of: '.zip'.")
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText('Use this button to import your zip file once loaded.')
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        'Use this button to export a zip file containing your file system, and all emulator related settings/state.'
      )
    ).toBeVisible();

    await userEvent.click(screen.getByText('Last'));
  });
});
