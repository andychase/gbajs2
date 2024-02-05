import { Button } from '@mui/material';
import { useCallback, useId, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { BiCloudUpload } from 'react-icons/bi';
import { styled } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CenteredTextContainer } from '../shared/styled.tsx';

type InputProps = {
  saveFiles: File[];
};

type FormProps = {
  $isDragActive?: boolean;
};

const StyledForm = styled.form<FormProps>`
  cursor: pointer;
  border-color: ${({ theme }) => theme.blackRussian};
  background-color: ${({ $isDragActive = false, theme }) =>
    $isDragActive ? theme.arcticAirBlue : theme.aliceBlue2};
  border-width: 1px;
  border-style: dashed;
  padding: 0.5rem;
  text-align: center;
`;

const HiddenInput = styled.input`
  display: none;
`;

const BiCloudUploadLarge = styled(BiCloudUpload)`
  height: 60px;
  width: auto;
`;

export const UploadSavesModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const {
    register,
    reset,
    handleSubmit,
    setValue,
    formState: { errors },
    watch
  } = useForm<InputProps>();
  const [hasCompletedUpload, setHasCompletedUpload] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const uploadSavesFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setValue('saveFiles', acceptedFiles, { shouldValidate: true });
      setHasCompletedUpload(false);
    },
    [setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const onSubmit: SubmitHandler<InputProps> = ({ saveFiles }) => {
    saveFiles.forEach((saveFile) => emulator?.uploadSaveOrSaveState(saveFile));
    reset();
    setHasCompletedUpload(true);
  };

  const triggerFileInputOnClick = () => {
    if (hiddenInputRef.current) hiddenInputRef.current.click();
  };

  const files = watch('saveFiles');

  const validateFileNames = (saveFiles: File[]) => {
    return saveFiles.every(
      (saveFile: File) => saveFile.name.split('.').pop() === 'sav'
    );
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your save files, or click to select
            save files.
          </p>
          <p>You may drop or select multiple save files!</p>
        </>
      ),
      target: `#${CSS.escape(uploadSavesFormId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Saves" />
      <ModalBody>
        <StyledForm
          {...getRootProps({
            id: uploadSavesFormId,
            onSubmit: handleSubmit(onSubmit),
            $isDragActive: isDragActive,
            onClick: triggerFileInputOnClick,
            'aria-label': 'Upload Saves'
          })}
        >
          <HiddenInput
            {...getInputProps({
              ...register('saveFiles', {
                validate: (savList) =>
                  (savList?.length > 0 && validateFileNames(savList)) ||
                  'At least one .sav file is required'
              }),
              ref: hiddenInputRef,
              'data-testid': 'savefiles-hidden-input'
            })}
          />
          <BiCloudUploadLarge />
          <p>
            Drag and drop save files here,
            <br /> or click to upload files
          </p>
          {errors.saveFiles && (
            <p>
              Save file upload has failed: <br /> - {errors.saveFiles.message}
            </p>
          )}
        </StyledForm>
        <div>
          {!!files?.length && (
            <CenteredTextContainer>
              <p>Files to upload:</p>
              {files.map((file) => {
                return (
                  <div key={file.name}>
                    <p>{file.name}</p>
                  </div>
                );
              })}
            </CenteredTextContainer>
          )}
          {hasCompletedUpload && (
            <CenteredTextContainer>
              <p>Upload complete!</p>
            </CenteredTextContainer>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button form={uploadSavesFormId} type="submit" variant="contained">
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedUploadSavesTour"
      />
    </>
  );
};
