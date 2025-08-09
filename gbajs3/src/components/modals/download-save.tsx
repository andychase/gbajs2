import { Button } from '@mui/material';
import { useId, useState } from 'react';
import { BiError } from 'react-icons/bi';
import { useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { CenteredText } from '../shared/styled.tsx';

export const DownloadSaveModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const downloadSaveButtonId = useId();
  const [error, setError] = useState(false);

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>Use this button to download your current save file.</p>
          <p>Remember to save in game before downloading!</p>
        </>
      ),
      placement: 'right',
      target: `#${CSS.escape(downloadSaveButtonId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Download Save" />
      <ModalBody>
        {error ? (
          <ErrorWithIcon
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Load a rom to download its save file"
          />
        ) : (
          <CenteredText>
            Remember to save in game before downloading your save file!
          </CenteredText>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          id={downloadSaveButtonId}
          variant="contained"
          onClick={() => {
            const save = emulator?.getCurrentSave();
            const saveName = emulator?.getCurrentSaveName();

            if (save && saveName) {
              const saveFile = new Blob([save.slice()], {
                type: 'data:application/octet-stream'
              });

              const link = document.createElement('a');
              link.download = saveName;
              link.href = URL.createObjectURL(saveFile);
              link.click();
              link.remove();
              setTimeout(() => URL.revokeObjectURL(link.href), 0);
            } else {
              setError(true);
            }
          }}
        >
          Download
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedDownloadSaveTour"
      />
    </>
  );
};
