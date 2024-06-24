import { Button } from '@mui/material';
import { useCallback, useId } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';
import { CenteredTextContainer } from '../shared/styled.tsx';

type InputProps = {
  saveFiles: File[];
};

const validFileExtensions = [
  '.sav',
  { regex: /\.ss[0-9]+/, displayText: '.ss' }
];

export const UploadSavesModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const {
    reset,
    handleSubmit,
    setValue,
    formState: { isSubmitSuccessful },
    control
  } = useForm<InputProps>();
  const uploadSavesFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('saveFiles', acceptedFiles, { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = ({ saveFiles }) => {
    saveFiles.forEach((saveFile) => emulator?.uploadSaveOrSaveState(saveFile));
    reset();
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop your save or save state files, or
            click to select files.
          </p>
          <p>
            Save and save state files should have an extension '.sav' or start
            with '.ss'.
          </p>
          <p>You may drop or select multiple files!</p>
        </>
      ),
      target: `#${CSS.escape(`${uploadSavesFormId}--drag-and-drop`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Saves" />
      <ModalBody>
        <form
          id={uploadSavesFormId}
          aria-label="Upload Saves Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Controller
            control={control}
            name="saveFiles"
            rules={{
              validate: (saveFiles) =>
                saveFiles?.length > 0 ||
                'At least one .sav, or .ss file is required'
            }}
            render={({ field: { name, value }, fieldState: { error } }) => (
              <DragAndDropInput
                ariaLabel="Upload Saves"
                id={`${uploadSavesFormId}--drag-and-drop`}
                onDrop={onDrop}
                name={name}
                validFileExtensions={validFileExtensions}
                error={error?.message}
                hideAcceptedFiles={!value?.length}
                hideErrors={isSubmitSuccessful}
                multiple
              >
                <p>
                  Drag and drop save or save state files here, or click to
                  upload files
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
          form={uploadSavesFormId}
          showSuccess={isSubmitSuccessful}
          type="submit"
        />
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
