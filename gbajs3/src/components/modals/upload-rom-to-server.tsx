import { Button } from '@mui/material';
import { useId } from 'react';
import { BiError } from 'react-icons/bi';
import { useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useUpLoadRom } from '../../hooks/use-upload-rom.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { PacmanIndicator } from '../shared/loading-indicator.tsx';
import { CenteredText } from '../shared/styled.tsx';

type DynamicBodyProps = {
  errorColor: string;
  loadingColor: string;
  respStatus: number | undefined;
  isLoading: boolean;
  hasError: boolean;
};

const DynamicBody = ({
  errorColor,
  loadingColor,
  respStatus,
  isLoading,
  hasError
}: DynamicBodyProps) => {
  let BodyContents = null;
  if (isLoading) {
    BodyContents = () => (
      <PacmanIndicator data-testid="upload-rom-spinner" color={loadingColor} />
    );
  } else if (hasError) {
    BodyContents = () => (
      <ErrorWithIcon
        icon={<BiError style={{ color: errorColor }} />}
        text="Rom file upload has failed"
      />
    );
  } else if (respStatus === 200) {
    BodyContents = () => (
      <CenteredText>Rom file upload was successful!</CenteredText>
    );
  } else {
    BodyContents = () => (
      <CenteredText>
        Are you sure you want to upload your current rom file to the server?
      </CenteredText>
    );
  }

  return (
    <ModalBody>
      <BodyContents />
    </ModalBody>
  );
};

export const UploadRomToServerModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const uploadRomToServerButtonId = useId();
  const { data, isLoading, error, execute: executeUploadRom } = useUpLoadRom();

  const tourSteps: TourSteps = [
    {
      content: (
        <p>Use this button to upload your current rom file to the server.</p>
      ),
      placement: 'right',
      target: `#${CSS.escape(uploadRomToServerButtonId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Send Rom to Server" />
      <DynamicBody
        errorColor={theme.errorRed}
        loadingColor={theme.gbaThemeBlue}
        isLoading={isLoading}
        hasError={!!error}
        respStatus={data?.status}
      />
      <ModalFooter>
        <Button
          id={uploadRomToServerButtonId}
          variant="contained"
          onClick={() => {
            const romFileBytes = emulator?.getCurrentRom();
            const romName = emulator?.getCurrentGameName();

            if (romFileBytes && romName) {
              const romFileBlob = new Blob([romFileBytes]);
              const romFile = new File([romFileBlob], romName);
              executeUploadRom({ romFile });
            }
          }}
        >
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedUploadRomToServerTour"
      />
    </>
  );
};
