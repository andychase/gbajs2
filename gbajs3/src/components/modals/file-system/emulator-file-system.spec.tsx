import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmulatorFileSystem } from './emulator-file-system.tsx';
import { renderWithContext } from '../../../../test/render-with-context.tsx';

import type { FileNode } from '../../../emulator/mgba/mgba-emulator.tsx';

describe('<EmulatorFileSystem />', () => {
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
        children: [
          {
            path: '/data/states/rom1.ss1',
            isDir: false,
            children: []
          }
        ]
      }
    ],
    nextNeighbor: {
      path: '/autosave',
      isDir: true,
      children: [
        {
          path: '/autosave/rom1_auto.ss',
          isDir: false,
          children: []
        },
        {
          path: '/autosave/rom2_auto.ss',
          isDir: false,
          children: []
        }
      ]
    }
  };

  const defaultProps = {
    id: 'test-id',
    allFiles: defaultFSData,
    deleteFile: vi.fn(),
    downloadFile: vi.fn()
  };

  it('renders file system tree', async () => {
    renderWithContext(<EmulatorFileSystem {...defaultProps} />);

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

    // expand autosave neighbor mount
    if (defaultFSData.nextNeighbor?.path) {
      const path =
        defaultFSData.nextNeighbor?.path.split('/').pop() ?? 'invalid_path';
      await userEvent.click(screen.getByText(path));
    }

    // shows the next neighbor (autosave mount) children
    if (defaultFSData.nextNeighbor) assertFileTree(defaultFSData.nextNeighbor);
  });

  it('calls deleteFile on button click', async () => {
    const deleteFileSpy: (p: string) => void = vi.fn();

    renderWithContext(
      <EmulatorFileSystem {...defaultProps} deleteFile={deleteFileSpy} />
    );

    await userEvent.click(screen.getByText('games'));
    await userEvent.click(screen.getByLabelText('Delete rom1.gba'));

    expect(deleteFileSpy).toHaveBeenCalledOnce();
    expect(deleteFileSpy).toHaveBeenCalledWith('/data/games/rom1.gba');
  });

  it('calls download file on button click', async () => {
    const downloadFileSpy = vi.fn();
    renderWithContext(
      <EmulatorFileSystem {...defaultProps} downloadFile={downloadFileSpy} />
    );

    await userEvent.click(screen.getByText('states'));
    await userEvent.click(screen.getByLabelText('Download rom1.ss1'));

    expect(downloadFileSpy).toHaveBeenCalledOnce();
    expect(downloadFileSpy).toHaveBeenCalledWith('/data/states/rom1.ss1');
  });
});
