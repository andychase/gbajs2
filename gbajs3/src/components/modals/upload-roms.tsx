import { Button, Divider, Checkbox, TextField } from '@mui/material';
import { useCallback, useEffect, useId, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { BiError } from 'react-icons/bi';
import { useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { useLoadExternalRom } from '../../hooks/use-load-external-rom.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import {
  LoadingIndicator,
  PacmanIndicator
} from '../shared/loading-indicator.tsx';

import type { CheckboxProps } from '@mui/material';

type InputProps = {
  romFiles: File[];
  romFileToRun: string;
  romURL: string;
};

type RunRomCheckbox = {
  fileName: string;
} & Pick<CheckboxProps, 'checked' | 'onChange'>;

type AdditionalFileActionsProps = {
  fileName: string;
  index: number;
  selectedFileName: string | null;
  setSelectedFileName: (name: string | null) => void;
};

const validFileExtensions = ['.gba', '.gbc', '.gb', '.zip', '.7z'];

const RunRomCheckbox = ({ fileName, checked, onChange }: RunRomCheckbox) => (
  <Checkbox
    inputProps={{ 'aria-label': `Run ${fileName}` }}
    checked={checked}
    onChange={onChange}
    sx={{ padding: '0 ' }}
  />
);

const AdditionalFileActions = ({
  fileName,
  index,
  selectedFileName,
  setSelectedFileName
}: AdditionalFileActionsProps) => {
  const isChecked =
    fileName === selectedFileName || (!selectedFileName && index === 0);

  return (
    <RunRomCheckbox
      fileName={fileName}
      checked={isChecked}
      onChange={() => setSelectedFileName(isChecked ? null : fileName)}
    />
  );
};

export const UploadRomsModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    watch,
    control
  } = useForm<InputProps>();
  const [currentRomURL, setCurrentRomURL] = useState<string | null>(null);
  const {
    data: externalRomFile,
    isLoading: isExternalRomLoading,
    error: externalRomLoadError,
    execute: executeLoadExternalRom
  } = useLoadExternalRom();
  const uploadRomFormId = useId();
  const runGame = useRunGame();
  const { syncActionIfEnabled } = useAddCallbacks();

  const shouldUploadExternalRom =
    !isExternalRomLoading && !!externalRomFile && !!currentRomURL;

  useEffect(() => {
    if (shouldUploadExternalRom) {
      const runCallback = () => {
        syncActionIfEnabled();
        const hasSucceeded = runGame(externalRomFile.name);
        if (hasSucceeded) setIsModalOpen(false);
      };
      emulator?.uploadRom(externalRomFile, runCallback);
      setCurrentRomURL(null);
    }
  }, [
    shouldUploadExternalRom,
    externalRomFile,
    emulator,
    setIsModalOpen,
    runGame,
    syncActionIfEnabled
  ]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('romFiles', acceptedFiles, { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({
    romFiles,
    romFileToRun,
    romURL
  }) => {
    if (romURL) {
      setCurrentRomURL(romURL);
      await executeLoadExternalRom({ url: new URL(romURL) });
      return;
    }

    await Promise.all(
      romFiles.map(
        (romFile, idx) =>
          new Promise<boolean>((resolve) => {
            const runCallback = () =>
              resolve(
                (romFile.name === romFileToRun ||
                  (!romFileToRun && idx === 0)) &&
                  runGame(romFile.name)
              );
            emulator?.uploadRom(romFile, runCallback);
          })
      )
    );

    syncActionIfEnabled();
    setIsModalOpen(false);
  };

  const isRomFileSet = !!watch('romFiles')?.length;

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop roms or zipped rom files, or click to
            select files.
          </p>
          <p>
            Rom files should have an extension of:{' '}
            {validFileExtensions.map((ext) => `'${ext}'`).join(', ')}.
          </p>
          <p>
            You may drop or select multiple files, once uploaded the selected
            game will boot!
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
        <LoadingIndicator
          isLoading={isExternalRomLoading}
          currentName={currentRomURL}
          indicator={<PacmanIndicator />}
          loadingCopy="Loading rom from url:"
        >
          <form
            id={uploadRomFormId}
            aria-label="Upload Roms Form"
            onSubmit={handleSubmit(onSubmit)}
          >
            <Controller
              control={control}
              name="romFiles"
              rules={{
                validate: (roms, formValues) =>
                  !!formValues.romURL ||
                  !!roms ||
                  'At least one rom file or URL is required'
              }}
              render={({ field: { name }, fieldState: { error } }) => (
                <DragAndDropInput
                  ariaLabel="Upload Rom"
                  id={`${uploadRomFormId}--drag-and-drop`}
                  onDrop={onDrop}
                  name={name}
                  validFileExtensions={validFileExtensions}
                  hideErrors={!!error}
                  multiple
                  renderAdditionalFileActions={(props) => (
                    <AdditionalFileActions
                      selectedFileName={watch('romFileToRun')}
                      setSelectedFileName={(name) =>
                        setValue('romFileToRun', name ?? 'none')
                      }
                      {...props}
                    />
                  )}
                >
                  <p>
                    Drag and drop roms or zipped rom files here, or click to
                    upload files
                  </p>
                </DragAndDropInput>
              )}
            />
            {!isRomFileSet && (
              <>
                <Divider sx={{ padding: '10px 0' }}>or</Divider>
                <TextField
                  id={`${uploadRomFormId}--rom-url`}
                  error={!!errors?.romURL}
                  label="Upload from a URL"
                  size="small"
                  autoComplete="romURL"
                  variant="filled"
                  helperText={errors?.romURL?.message}
                  aria-label="Upload Rom From URL"
                  fullWidth
                  {...register('romURL', {
                    validate: (romURL, formValues) => {
                      if (!romURL) return true;

                      if (formValues.romFiles)
                        return 'Cannot specify both files and a URL';

                      try {
                        new URL(romURL);
                        return true;
                      } catch {
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
              </>
            )}
            {errors.romFiles?.message && (
              <ErrorWithIcon
                icon={<BiError style={{ color: theme.errorRed }} />}
                text={errors.romFiles.message}
              />
            )}
          </form>
        </LoadingIndicator>
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
