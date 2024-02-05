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
  cheatFiles: File[];
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

export const UploadCheatsModal = () => {
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
  const cheatsFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setValue('cheatFiles', acceptedFiles, { shouldValidate: true });
      setHasCompletedUpload(false);
    },
    [setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const onSubmit: SubmitHandler<InputProps> = ({ cheatFiles }) => {
    cheatFiles.forEach((cheatFiles) => emulator?.uploadCheats(cheatFiles));
    reset();
    setHasCompletedUpload(true);
  };

  const triggerFileInputOnClick = () => {
    if (hiddenInputRef.current) hiddenInputRef.current.click();
  };

  const files = watch('cheatFiles');

  const validateFileNames = (cheatFiles: File[]) => {
    return cheatFiles.every(
      (cheatFile: File) => cheatFile.name.split('.').pop() === 'cheats'
    );
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your cheat files, or click to select
            cheat files.
          </p>
          <p>
            Cheat files should be in libretro format and have the file extension
            '.cheats'.
          </p>
          <p>You may drop or select multiple cheat files!</p>
        </>
      ),
      target: `#${CSS.escape(cheatsFormId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Cheats" />
      <ModalBody>
        <StyledForm
          {...getRootProps({
            id: cheatsFormId,
            onSubmit: handleSubmit(onSubmit),
            $isDragActive: isDragActive,
            onClick: triggerFileInputOnClick,
            'aria-label': 'Upload Cheats'
          })}
        >
          <HiddenInput
            {...getInputProps({
              ...register('cheatFiles', {
                validate: (cheatsList) =>
                  (cheatsList?.length > 0 && validateFileNames(cheatsList)) ||
                  'At least one .cheats file is required'
              }),
              ref: hiddenInputRef,
              'data-testid': 'cheatfiles-hidden-input'
            })}
          />
          <BiCloudUploadLarge />
          <p>
            Drag and drop a cheats file here,
            <br /> or click to upload a file
          </p>
          {errors.cheatFiles && (
            <p>
              Cheats file submit has failed: <br /> -{' '}
              {errors.cheatFiles.message}
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
        <Button form={cheatsFormId} type="submit" variant="contained">
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedUploadCheatsTour"
      />
    </>
  );
};
