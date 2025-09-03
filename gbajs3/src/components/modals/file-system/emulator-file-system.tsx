import { IconButton } from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';
import {
  SimpleTreeView,
  TreeItem,
  treeItemClasses,
  type TreeItemProps
} from '@mui/x-tree-view';
import { Fragment, type ReactNode } from 'react';
import { BiCloudDownload, BiTrash } from 'react-icons/bi';
import { styled } from 'styled-components';

import {
  CloseSquare,
  PlusSquare,
  MinusSquare
} from '../../shared/action-box-icons.tsx';

import type { FileNode } from '../../../emulator/mgba/mgba-emulator.tsx';

type EmulatorFileSystemProps = {
  id: string;
  allFiles?: FileNode;
  deleteFile: (path: string) => void;
  downloadFile: (path: string) => void;
};

const LeafLabelWrapper = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
`;

const LeafText = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
`;

const IconSeparator = styled.div`
  display: flex;
  gap: clamp(0.1rem, 2vw, 2rem);
`;

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
    marginLeft: 11,
    paddingLeft: 10,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`
  },
  [`& .${treeItemClasses.content}`]: {
    padding: theme.spacing(0.5, 0.5),
    margin: theme.spacing(0.2, 0),
    alignItems: 'baseline'
  }
}));

// renders a tree of emulator files, with actions to delete and download specified by the caller
export const EmulatorFileSystem = ({
  id,
  allFiles,
  deleteFile,
  downloadFile
}: EmulatorFileSystemProps) => {
  if (!allFiles) return null;

  const renderTree = (node: FileNode): ReactNode => {
    const nodeName = node.path.split('/').pop();

    const leafLabelNode = (
      <LeafLabelWrapper>
        <LeafText>{nodeName}</LeafText>
        <IconSeparator>
          <IconButton
            aria-label={`Download ${nodeName}`}
            sx={{ padding: 0, margin: 0 }}
            onClick={() => downloadFile(node.path)}
          >
            <BiCloudDownload />
          </IconButton>
          <IconButton
            aria-label={`Delete ${nodeName}`}
            sx={{ padding: 0 }}
            onClick={() => deleteFile(node.path)}
          >
            <BiTrash />
          </IconButton>
        </IconSeparator>
      </LeafLabelWrapper>
    );

    return (
      <Fragment key={node.path}>
        <StyledTreeItem
          itemId={node.path}
          label={node.isDir ? nodeName : leafLabelNode}
        >
          {node.isDir && !!node.children
            ? node.children.map((node) => renderTree(node))
            : null}
        </StyledTreeItem>
        {node.nextNeighbor && renderTree(node.nextNeighbor)}
      </Fragment>
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
      sx={{ height: 'fit-content' }}
    >
      {renderTree(allFiles)}
    </SimpleTreeView>
  );
};
