import { Button, TextField } from '@mui/material';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { BiCloudUpload, BiError } from 'react-icons/bi';
import { PacmanLoader } from 'react-spinners';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { useLoadExternalRom } from '../../hooks/use-load-external-rom.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { CenteredTextContainer } from '../shared/styled.tsx';

type InputProps = {
  romFile: File;
  romURL: string;
};

type StyledDragAndDropProps = {
  $isDragActive?: boolean;
};

type RomLoadingIndicatorProps = {
  isLoading: boolean;
  currentRomURL: string | null;
  children: ReactNode[];
  indicator: ReactNode;
};

const StyledDragAndDrop = styled.div<StyledDragAndDropProps>`
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

const RomLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  align-items: center;
  margin-bottom: 15px;
`;

const URLDisplay = styled.p`
  word-wrap: break-word;
  max-width: 100%;
`;

const RomLoadingIndicator = ({
  isLoading,
  currentRomURL,
  children,
  indicator
}: RomLoadingIndicatorProps) => {
  return isLoading ? (
    <RomLoadingContainer>
      <URLDisplay>
        Loading rom from url:
        <br />
        {currentRomURL}
      </URLDisplay>
      {indicator}
    </RomLoadingContainer>
  ) : (
    children
  );
};

export const UploadRomModal = () => {
  const theme = useTheme();
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
  const [currentRomURL, setCurrentRomURL] = useState<string | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const {
    data: externalRomFile,
    isLoading: isExternalRomLoading,
    error: externalRomLoadError,
    execute: executeLoadExternalRom
  } = useLoadExternalRom();
  const uploadRomFormId = useId();
  const runGame = useRunGame();

  useEffect(() => {
    if (!isExternalRomLoading && externalRomFile && currentRomURL) {
      const runCallback = () => {
        const hasSucceeded = runGame(
          emulator?.filePaths().gamePath + '/' + externalRomFile.name
        );
        if (hasSucceeded) {
          setIsModalOpen(false);
        }
      };
      emulator?.uploadRom(externalRomFile, runCallback);
      setCurrentRomURL(null);
      reset();
      setHasCompletedUpload(true);
    }
  }, [
    currentRomURL,
    emulator,
    externalRomFile,
    isExternalRomLoading,
    reset,
    setIsModalOpen,
    runGame
  ]);

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

  const onSubmit: SubmitHandler<InputProps> = async ({ romFile, romURL }) => {
    if (romURL) {
      setCurrentRomURL(romURL);
      await executeLoadExternalRom({ url: new URL(romURL) });
      return;
    }

    const runCallback = () => {
      const hasSucceeded = runGame(
        emulator?.filePaths().gamePath + '/' + romFile.name
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

  const validFileExtensions = ['gba', 'gbc', 'gb', 'zip', '7z'];

  const validateFileName = (rom: File) =>
    validFileExtensions.includes(rom.name.split('.').pop() ?? '');

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your rom or zipped rom file, or click
            to select a file.
          </p>
          <p>
            Rom files should have an extension of:{' '}
            {validFileExtensions.map((ext) => `'.${ext}'`).join(', ')}.
          </p>
          <p>
            You may drop or select one rom at a time, once uploaded your game
            will boot!
          </p>
        </>
      ),
      target: `#${CSS.escape(`${uploadRomFormId}--drag-and-drop`)}`
    },
    {
      content: (
        <p>Alternatively, you may load a rom file from an external URL.</p>
      ),
      target: `#${CSS.escape(`${uploadRomFormId}--rom-url`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Rom" />
      <ModalBody>
        <RomLoadingIndicator
          isLoading={isExternalRomLoading}
          currentRomURL={currentRomURL}
          indicator={
            <PacmanLoader
              color={theme.gbaThemeBlue}
              cssOverride={{ margin: '0 auto' }}
            />
          }
        >
          <form
            id={uploadRomFormId}
            aria-label="Upload Rom Form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <StyledDragAndDrop
              {...getRootProps({
                id: `${uploadRomFormId}--drag-and-drop`,
                $isDragActive: isDragActive,
                onClick: triggerFileInputOnClick,
                'aria-label': 'Upload Rom'
              })}
            >
              <HiddenInput
                {...getInputProps({
                  ...register('romFile', {
                    validate: (rom, formValues) =>
                      !!formValues.romURL ||
                      (!!rom && validateFileName(rom)) ||
                      'One .gba, .gbc, .gb, .zip, or .7z file is required'
                  }),
                  ref: hiddenInputRef,
                  'data-testid': 'romfile-hidden-input'
                })}
              />
              <BiCloudUploadLarge />
              <p>
                Drag and drop a rom or zipped rom file here, or click to upload
                a file
              </p>
              {file instanceof File && !!file && (
                <CenteredTextContainer>
                  <p>File to upload:</p>
                  <p>{file.name}</p>
                </CenteredTextContainer>
              )}
              {errors.romFile && (
                <p>
                  Rom file is invalid: <br /> - {errors.romFile.message}
                </p>
              )}
            </StyledDragAndDrop>
            <p>Or upload from a URL:</p>
            <TextField
              id={`${uploadRomFormId}--rom-url`}
              error={!!errors?.romURL}
              label="Rom URL"
              size="small"
              autoComplete="romURL"
              variant="filled"
              helperText={errors?.romURL?.message}
              aria-label="Upload Rom From URL"
              fullWidth
              {...register('romURL', {
                validate: (romURL, formValues) => {
                  if (!romURL) return true;

                  if (formValues.romFile)
                    return 'Cannot specify both a file and a URL';

                  try {
                    new URL(romURL);
                    return true;
                  } catch (err) {
                    return 'Invalid URL';
                  }
                }
              })}
            />
            {!!externalRomLoadError && (
              <ErrorWithIcon
                icon={<BiError style={{ color: theme.errorRed }} />}
                text="Loading rom from URL has failed"
              />
            )}
          </form>
          {hasCompletedUpload && (
            <CenteredTextContainer>
              <p>Upload complete!</p>
            </CenteredTextContainer>
          )}
        </RomLoadingIndicator>
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
