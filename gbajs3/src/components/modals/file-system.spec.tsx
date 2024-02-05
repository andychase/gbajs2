import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileSystemModal } from './file-system.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

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
        path: '/data/cheats',
        isDir: true,
        children: []
      },
      {
        path: '/data/games',
        isDir: true,
        children: [
          {
            path: '/data/games/rom1.gba',
            isDir: false,
            children: []
          },
          {
            path: '/data/games/rom2.gba',
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
            path: '/data/saves/rom1.sav',
            isDir: false,
            children: []
          }
        ]
      },
      {
        path: '/data/states',
        isDir: true,
        children: []
      }
    ]
  };

  it('renders file system tree', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listAllFiles: () => defaultFSData
        } as GBAEmulator
      };
    });

    renderWithContext(<FileSystemModal />);

    const assertFileTree = (
      fileNode: FileNode,
      stopDepth?: number,
      acc = 0
    ) => {
      const renderedPath = fileNode.path.split('/').pop() ?? 'invalid_path';

      if (stopDepth && acc > stopDepth) {
        expect(screen.queryByText(renderedPath)).not.toBeInTheDocument();
      } else {
        expect(screen.getByText(renderedPath)).toBeVisible();
      }

      /* see: https://github.com/testing-library/eslint-plugin-testing-library/issues/683 */
      /* eslint-disable testing-library/no-node-access */
      if (fileNode.children?.length) {
        fileNode.children.forEach((child) =>
          assertFileTree(child, stopDepth, acc + 1)
        );
      }
      /* eslint-enable testing-library/no-node-access */
    };

    // first node should be expanded by default, renders children
    assertFileTree(defaultFSData, 1);

    // expand default directories
    // eslint-disable-next-line testing-library/no-node-access
    for (const child of defaultFSData.children ?? []) {
      const childPath = child.path.split('/').pop() ?? 'invalid_path';
      await userEvent.click(screen.getByText(childPath));
    }

    // renders all default nodes
    assertFileTree(defaultFSData);
  });

  it('deletes file from the tree', async () => {
    const deleteFileSpy: (p: string) => void = vi.fn();
    const listAllFilesSpy = vi.fn(() => defaultFSData);
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listAllFiles: listAllFilesSpy as () => FileNode,
          deleteFile: deleteFileSpy
        } as GBAEmulator
      };
    });

    renderWithContext(<FileSystemModal />);

    listAllFilesSpy.mockClear(); // clear calls from initial render

    await userEvent.click(screen.getByText('games'));
    await userEvent.click(screen.getByLabelText('Delete rom1.gba'));

    expect(deleteFileSpy).toHaveBeenCalledOnce();
    expect(deleteFileSpy).toHaveBeenCalledWith('/data/games/rom1.gba');
    expect(listAllFilesSpy).toHaveBeenCalledOnce();
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
        fsSync: emulatorFSSyncSpy
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

  it('renders tour steps', async () => {
    const {
      useModalContext: originalModal,
      useEmulatorContext: originalEmulator
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...originalEmulator(),
        emulator: {
          listAllFiles: () => defaultFSData
        } as GBAEmulator
      };
    });

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      isModalOpen: true
    }));

    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );

    renderWithContext(<FileSystemModal />);

    expect(
      await screen.findByText(
        'Use this area to view your current file tree, as well as delete files from the tree.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this area to view your current file tree, as well as delete files from the tree.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        (_, element) =>
          element?.nodeName === 'P' &&
          element?.textContent ===
            'Use the SAVE FILE SYSTEM button to persist all of your files to your device!'
      )
    ).toBeVisible();
  });
});
