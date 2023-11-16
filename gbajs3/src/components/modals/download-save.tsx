import { Button } from '@mui/material';
import { useContext, useId, useState } from 'react';
import { BiError } from 'react-icons/bi';
import { useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { EmulatorContext } from '../../context/emulator/emulator.tsx';
import { ModalContext } from '../../context/modal/modal.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { CenteredText } from '../shared/styled.tsx';

export const DownloadSaveModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useContext(ModalContext);
  const { emulator } = useContext(EmulatorContext);
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
              const saveFile = new Blob([save], {
                type: 'data:application/x-spss-sav'
              });

              const link = document.createElement('a');
              link.download = saveName;
              link.href = URL.createObjectURL(saveFile);
              link.click();
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
