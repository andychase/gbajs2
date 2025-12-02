import { Button } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { styled } from 'styled-components';

import { EmulatorFileSystem } from './file-system/emulator-file-system.tsx';
import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useFileStat } from '../../hooks/emulator/use-file-stat.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { downloadBlob } from './file-utilities/blob.ts';

import type { FileNode } from '../../emulator/mgba/mgba-emulator.tsx';

const FlexModalBody = styled(ModalBody)`
  display: flex;
  flex-direction: column;
  gap: 1em;
`;

export const FileSystemModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const { syncActionIfEnabled } = useAddCallbacks();
  const [allFiles, setAllFiles] = useState<FileNode | undefined>();

  const deleteFile = useCallback(
    async (path: string) => {
      emulator?.deleteFile(path);
      setAllFiles(emulator?.listAllFiles());
      await syncActionIfEnabled();
    },
    [emulator, syncActionIfEnabled]
  );

  const autoSaveStatePath = emulator?.getCurrentAutoSaveStatePath();
  const { modifiedTime } = useFileStat(autoSaveStatePath);

  // the only flow that can force the file system to change without user interaction after the modal
  // is open is the auto save state timer, if the modified time of the current auto save state has
  // changed, we should refresh the file system view
  useEffect(
    () => setAllFiles(emulator?.listAllFiles()),
    [emulator, modifiedTime]
  );

  const downloadFile = (path: string) => {
    const fileName = path.split('/').pop();
    const file = emulator?.getFile(path);

    if (file && fileName) {
      const fileDownload = new Blob([file.slice()], {
        type: 'data:application/octet-stream'
      });

      downloadBlob(fileName, fileDownload);
    }
  };

  const renderedFiles = allFiles ?? emulator?.listAllFiles();

  return (
    <>
      <ModalHeader title="File System" />
      <FlexModalBody>
        <EmulatorFileSystem
          allFiles={renderedFiles}
          deleteFile={deleteFile}
          downloadFile={downloadFile}
        />
      </FlexModalBody>
      <ModalFooter>
        <CircleCheckButton copy="Save File System" onClick={emulator?.fsSync} />
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
