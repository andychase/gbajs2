import { Button } from '@mui/material';
import { useCallback, useId, useState } from 'react';
import { styled } from 'styled-components';

import { EmulatorFileSystem } from './file-system/emulator-file-system.tsx';
import { FileSystemOptionsForm } from './file-system/file-system-options-form.tsx';
import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';

import type { FileNode } from '../../emulator/mgba/mgba-emulator.tsx';

const FlexModalBody = styled(ModalBody)`
  display: flex;
  flex-direction: column;
  gap: 1em;
`;

export const FileSystemModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [allFiles, setAllFiles] = useState<FileNode | undefined>();
  const baseId = useId();

  const deleteFile = useCallback(
    (path: string) => {
      emulator?.deleteFile(path);
      setAllFiles(emulator?.listAllFiles());
    },
    [emulator]
  );

  const downloadFile = (path: string) => {
    const fileName = path.split('/').pop();
    const file = emulator?.getFile(path);

    if (file && fileName) {
      const fileDownload = new Blob([file], {
        type: 'data:application/octet-stream'
      });

      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(fileDownload);
      link.click();
      link.remove();
    }
  };

  const renderedFiles = allFiles ?? emulator?.listAllFiles();

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to view your current file tree, download files, and
            delete files from the tree.
          </p>
          <p>
            Use the <i>plus</i> and <i>minus</i> icons to open and close file
            tree branches!
          </p>
        </>
      ),
      target: `#${CSS.escape(`${baseId}--emulator-file-system`)}`
    },
    {
      content: (
        <p>
          Click the <i>Options</i> label to adjust and save settings related to
          the file system.
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--file-system-options`)}`
    },
    {
      content: (
        <p>
          Use the <i>SAVE FILE SYSTEM</i> button to persist all of your files to
          your device!
        </p>
      ),
      target: `#${CSS.escape(`${baseId}--save-file-system-button`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="File System" />
      <FlexModalBody>
        <EmulatorFileSystem
          id={`${baseId}--emulator-file-system`}
          allFiles={renderedFiles}
          deleteFile={deleteFile}
          downloadFile={downloadFile}
        />
        <FileSystemOptionsForm id={`${baseId}--file-system-options`} />
      </FlexModalBody>
      <ModalFooter>
        <CircleCheckButton
          copy="Save File System"
          id={`${baseId}--save-file-system-button`}
          onClick={emulator?.fsSync}
        />
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
