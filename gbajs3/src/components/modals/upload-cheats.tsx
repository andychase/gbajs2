import { Button } from '@mui/material';
import { useCallback, useId } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';
import { CenteredTextContainer } from '../shared/styled.tsx';

type InputProps = {
  cheatFiles: File[];
};

const validFileExtensions = ['.cheats'];

export const UploadCheatsModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const {
    reset,
    handleSubmit,
    setValue,
    formState: { isSubmitSuccessful },
    control
  } = useForm<InputProps>();
  const { syncActionIfEnabled } = useAddCallbacks();
  const cheatsFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('cheatFiles', acceptedFiles, { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({ cheatFiles }) => {
    await Promise.all(
      cheatFiles.map(
        (cheatFile) =>
          new Promise<void>((resolve) => {
            emulator?.uploadCheats(cheatFile, resolve);
          })
      )
    );

    reset();
    syncActionIfEnabled();
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your cheat files, or click to select
            files.
          </p>
          <p>
            Cheat files should be in libretro format and have the extension
            '.cheats'.
          </p>
          <p>You may drop or select multiple files!</p>
        </>
      ),
      target: `#${CSS.escape(`${cheatsFormId}--drag-and-drop`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Cheats" />
      <ModalBody>
        <form
          id={cheatsFormId}
          aria-label="Upload Cheats Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Controller
            control={control}
            name="cheatFiles"
            rules={{
              validate: (cheatFiles) =>
                cheatFiles?.length > 0 ||
                'At least one .cheats file is required'
            }}
            render={({ field: { name, value }, fieldState: { error } }) => (
              <DragAndDropInput
                ariaLabel="Upload Cheats"
                id={`${cheatsFormId}--drag-and-drop`}
                onDrop={onDrop}
                name={name}
                validFileExtensions={validFileExtensions}
                error={error?.message}
                hideAcceptedFiles={!value?.length}
                hideErrors={isSubmitSuccessful}
                multiple
              >
                <p>
                  Drag and drop cheat files here,
                  <br />
                  or click to upload files
                </p>
              </DragAndDropInput>
            )}
          />
          {isSubmitSuccessful && (
            <CenteredTextContainer>
              <p>Upload complete!</p>
            </CenteredTextContainer>
          )}
        </form>
      </ModalBody>
      <ModalFooter>
        <CircleCheckButton
          copy="Upload"
          form={cheatsFormId}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
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
