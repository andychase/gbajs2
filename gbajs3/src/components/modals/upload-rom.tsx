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
  romFile: File;
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

export const UploadRomModal = () => {
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
  const uploadRomFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setValue('romFile', acceptedFiles[0], { shouldValidate: true });
      setHasCompletedUpload(false);
    },
    [setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  const onSubmit: SubmitHandler<InputProps> = ({ romFile }) => {
    const runCallback = () => {
      const hasSucceeded = emulator?.run(
        emulator.filePaths().gamePath + '/' + romFile.name
      );
      if (hasSucceeded) {
        setIsModalOpen(false);
      }
    };
    emulator?.uploadRom(romFile, runCallback);
    reset();
    setHasCompletedUpload(true);
  };

  const triggerFileInputOnClick = () => {
    if (hiddenInputRef.current) hiddenInputRef.current.click();
  };

  const file = watch('romFile');

  const validateFileName = (rom: File) =>
    ['gba', 'gbc', 'gb'].includes(rom.name.split('.').pop() ?? '');

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your rom file, or click to select a
            rom file.
          </p>
          <p>
            You may drop or select one rom file at a time, once uploaded your
            game will boot!
          </p>
        </>
      ),
      target: `#${CSS.escape(uploadRomFormId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Rom" />
      <ModalBody>
        <StyledForm
          {...getRootProps({
            id: uploadRomFormId,
            onSubmit: handleSubmit(onSubmit),
            $isDragActive: isDragActive,
            onClick: triggerFileInputOnClick,
            'aria-label': 'Upload Rom'
          })}
        >
          <HiddenInput
            {...getInputProps({
              ...register('romFile', {
                validate: (rom) =>
                  (!!rom && validateFileName(rom)) ||
                  'One .gba, .gbc, or .gb file is required'
              }),
              ref: hiddenInputRef,
              'data-testid': 'romfile-hidden-input'
            })}
          />
          <BiCloudUploadLarge />
          <p>
            Drag and drop a rom file here,
            <br /> or click to upload a file
          </p>
          {errors.romFile && (
            <p>
              Rom file upload has failed: <br /> - {errors.romFile.message}
            </p>
          )}
        </StyledForm>
        <div>
          {file instanceof File && !!file && (
            <CenteredTextContainer>
              <p>File to upload:</p>
              <div key={file.name}>
                <p>{file.name}</p>
              </div>
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
        <Button form={uploadRomFormId} type="submit" variant="contained">
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedUploadRomTour"
      />
    </>
  );
};
