import { IconButton } from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';
import {
  SimpleTreeView,
  TreeItem,
  treeItemClasses,
  type TreeItemProps
} from '@mui/x-tree-view';
import { BiCloudDownload, BiTrash } from 'react-icons/bi';
import { styled } from 'styled-components';

import {
  CloseSquare,
  PlusSquare,
  MinusSquare
} from '../../shared/action-box-icons.tsx';

import type { FileNode } from '../../../emulator/mgba/mgba-emulator';

type EmulatorFileSystemProps = {
  id: string;
  allFiles?: FileNode;
  deleteFile: (path: string) => void;
  downloadFile: (path: string) => void;
};

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

const IconSeparator = styled.div`
  display: flex;
  gap: 15px;
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

  const renderTree = (node: FileNode) => {
    const nodeName = node.path.split('/').pop();

    const leafLabelNode = (
      <LeafLabelWrapper>
        <p>{nodeName}</p>
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
      sx={{ height: 'fit-content' }}
    >
      {renderTree(allFiles)}
    </SimpleTreeView>
  );
};
