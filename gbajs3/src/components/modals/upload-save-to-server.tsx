import { Button } from '@mui/material';
import { useId } from 'react';
import { BiError } from 'react-icons/bi';
import { useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useUpLoadSave } from '../../hooks/use-upload-save.tsx';
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
      <PacmanIndicator data-testid="upload-save-spinner" color={loadingColor} />
    );
  } else if (hasError) {
    BodyContents = () => (
      <ErrorWithIcon
        icon={<BiError style={{ color: errorColor }} />}
        text="Save file upload has failed"
      />
    );
  } else if (respStatus === 200) {
    BodyContents = () => (
      <CenteredText>Save file upload was successful!</CenteredText>
    );
  } else {
    BodyContents = () => (
      <CenteredText>
        Are you sure you want to upload your current save file to the server?
      </CenteredText>
    );
  }

  return (
    <ModalBody>
      <BodyContents />
    </ModalBody>
  );
};

export const UploadSaveToServerModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const uploadSaveToServerButtonId = useId();
  const {
    data,
    isLoading,
    error,
    execute: executeUploadSave
  } = useUpLoadSave();

  return (
    <>
      <ModalHeader title="Send Save to Server" />
      <DynamicBody
        errorColor={theme.errorRed}
        loadingColor={theme.gbaThemeBlue}
        isLoading={isLoading}
        hasError={!!error}
        respStatus={data?.status}
      />
      <ModalFooter>
        <Button
          id={uploadSaveToServerButtonId}
          variant="contained"
          onClick={() => {
            const saveFileBytes = emulator?.getCurrentSave();
            const saveName = emulator?.getCurrentSaveName();

            if (saveFileBytes && saveName) {
              const saveFileBlob = new Blob([saveFileBytes.slice()]);
              const saveFile = new File([saveFileBlob], saveName);
              executeUploadSave({ saveFile });
            }
          }}
        >
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
