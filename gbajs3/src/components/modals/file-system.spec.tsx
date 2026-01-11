import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileSystemModal } from './file-system.tsx';
import * as blobUtilities from './file-utilities/blob.ts';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';

import type {
  FileNode,
  GBAEmulator
} from '../../emulator/mgba/mgba-emulator.tsx';

describe('<FileSystemModal />', () => {
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
      }
    ]
  };

  it('renders main sections', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listAllFiles: () => defaultFSData,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      };
    });

    renderWithContext(<FileSystemModal />);

    // emulator file system
    expect(screen.getByLabelText('File System')).toBeVisible();
    // action buttons
    expect(
      screen.getByRole('button', { name: 'Save File System' })
    ).toBeVisible();
    expect(screen.getByText('Close', { selector: 'button' })).toBeVisible();
  });

  it('deletes file from the tree', async () => {
    const deleteFileSpy: (p: string) => void = vi.fn();
    const syncActionIfEnabledSpy = vi.fn();
    const listAllFilesSpy = vi.fn(() => defaultFSData);
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listAllFiles: listAllFilesSpy as () => FileNode,
          deleteFile: deleteFileSpy,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      };
    });

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<FileSystemModal />);

    listAllFilesSpy.mockClear(); // clear calls from initial render

    await userEvent.click(screen.getByText('games'));
    await userEvent.click(screen.getByLabelText('Delete rom1.gba'));

    expect(deleteFileSpy).toHaveBeenCalledOnce();
    expect(deleteFileSpy).toHaveBeenCalledWith('/data/games/rom1.gba');
    expect(listAllFilesSpy).toHaveBeenCalledOnce();
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
  });

  it('downloads file from the tree', async () => {
    const getFileSpy: (p: string) => Uint8Array = vi.fn(() =>
      new TextEncoder().encode('Some state file contents')
    );
    const downloadBlobSpy = vi
      .spyOn(blobUtilities, 'downloadBlob')
      .mockImplementation(() => new Blob());
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listAllFiles: () => defaultFSData,
          getFile: getFileSpy,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      };
    });

    renderWithContext(<FileSystemModal />);

    await userEvent.click(screen.getByText('games'));
    await userEvent.click(screen.getByLabelText('Download rom1.gba'));

    expect(getFileSpy).toHaveBeenCalledOnce();
    expect(getFileSpy).toHaveBeenCalledWith('/data/games/rom1.gba');

    expect(downloadBlobSpy).toHaveBeenCalledOnce();
    expect(downloadBlobSpy).toHaveBeenCalledWith('rom1.gba', expect.any(Blob));
  });

  it('saves file system', async () => {
    const emulatorFSSyncSpy: () => void = vi.fn();
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listAllFiles: () => defaultFSData,
        fsSync: emulatorFSSyncSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<FileSystemModal />);

    const saveFileSystemButton = screen.getByRole('button', {
      name: 'Save File System'
    });

    expect(saveFileSystemButton).toBeVisible();

    await userEvent.click(saveFileSystemButton);

    expect(emulatorFSSyncSpy).toHaveBeenCalledOnce();
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

    renderWithContext(<FileSystemModal />);

    // click the close button
    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });
});
