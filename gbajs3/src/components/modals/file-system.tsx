import { Button, IconButton } from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';
import {
  SimpleTreeView,
  TreeItem,
  treeItemClasses,
  type TreeItemProps
} from '@mui/x-tree-view';
import { useCallback, useId, useState } from 'react';
import { BiTrash } from 'react-icons/bi';
import { styled } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import {
  CloseSquare,
  PlusSquare,
  MinusSquare
} from '../shared/action-box-icons.tsx';

import type { FileNode } from '../../emulator/mgba/mgba-emulator.tsx';

type EmulatorFSProps = {
  id: string;
  allFiles?: FileNode;
  deleteFile: (path: string) => void;
};

const StyledTreeItem = muiStyled((props: TreeItemProps) => (
  <TreeItem {...props} />
))(({ theme }) => ({
  marginTop: 5,
  // note: using mui theme here
  [`& .${treeItemClasses.iconContainer}`]: {
    '& .close': {
      opacity: 0.3
    }
  },
  [`& .${treeItemClasses.groupTransition}`]: {
    marginLeft: 15,
    paddingLeft: 10,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`
  },
  [`& .${treeItemClasses.content}`]: {
    width: 'auto'
  }
}));

const LeafLabelWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;

  > p {
    margin: 0;
    word-wrap: break-word;
    max-width: 100%;
  }
`;

const EmulatorFS = ({ id, allFiles, deleteFile }: EmulatorFSProps) => {
  if (!allFiles) return null;

  const renderTree = (node: FileNode) => {
    const nodeName = node.path.split('/').pop();

    const leafLabelNode = (
      <LeafLabelWrapper>
        <p>{nodeName}</p>
        <IconButton
          aria-label={`Delete ${nodeName}`}
          sx={{ padding: 0 }}
          onClick={() => deleteFile(node.path)}
        >
          <BiTrash />
        </IconButton>
      </LeafLabelWrapper>
    );

    return (
      <StyledTreeItem
        key={node.path}
        itemId={node.path}
        label={node.isDir ? nodeName : leafLabelNode}
      >
        {node.isDir && !!node.children
          ? node.children.map((node) => {
              return renderTree(node);
            })
          : null}
      </StyledTreeItem>
    );
  };

  return (
    <SimpleTreeView
      id={id}
      aria-label="File System"
      defaultExpandedItems={[allFiles.path]}
      slots={{
        collapseIcon: MinusSquare,
        endIcon: CloseSquare,
        expandIcon: PlusSquare
      }}
      sx={{ minHeight: 264 }}
    >
      {renderTree(allFiles)}
    </SimpleTreeView>
  );
};

export const FileSystemModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [allFiles, setAllFiles] = useState<FileNode | undefined>();
  const emulatorFsId = useId();
  const saveFileSystemButtonId = useId();

  const deleteFile = useCallback(
    (path: string) => {
      emulator?.deleteFile(path);
      setAllFiles(emulator?.listAllFiles());
    },
    [emulator]
  );

  const renderedFiles = allFiles ?? emulator?.listAllFiles();

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to view your current file tree, as well as delete
            files from the tree.
          </p>
          <p>
            Use the <i>plus</i> and <i>minus</i> icons to open and close file
            tree branches!
          </p>
        </>
      ),
      target: `#${CSS.escape(emulatorFsId)}`
    },
    {
      content: (
        <p>
          Use the <i>SAVE FILE SYSTEM</i> button to persist all of your files to
          your device!
        </p>
      ),
      target: `#${CSS.escape(saveFileSystemButtonId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="File System" />
      <ModalBody>
        <EmulatorFS
          id={emulatorFsId}
          allFiles={renderedFiles}
          deleteFile={deleteFile}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          id={saveFileSystemButtonId}
          variant="contained"
          onClick={emulator?.fsSync}
        >
          Save File System
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedFileSystemTour"
      />
    </>
  );
};
