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
import { DragAndDropInput } from '../shared/drag-and-drop-input.tsx';

type InputProps = {
  patchFiles: File[];
};

const validFileExtensions = ['.ips', '.ups', '.bps'];

export const UploadPatchesModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const { syncActionIfEnabled } = useAddCallbacks();
  const { reset, handleSubmit, setValue, control } = useForm<InputProps>();
  const uploadPatchesFormId = useId();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      reset();
      setValue('patchFiles', acceptedFiles, { shouldValidate: true });
    },
    [reset, setValue]
  );

  const onSubmit: SubmitHandler<InputProps> = async ({ patchFiles }) => {
    await Promise.all(
      patchFiles.map(
        (patchFile) =>
          new Promise<void>((resolve) =>
            emulator?.uploadPatch(patchFile, resolve)
          )
      )
    );

    await syncActionIfEnabled();
    setIsModalOpen(false);
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to drag and drop .ips/.ups/.bps patch files, or click
            to select files.
          </p>
          <p>The name of your patch files must match the name of your rom.</p>
          <p>You may drop or select multiple files!</p>
        </>
      ),
      target: `#${CSS.escape(`${uploadPatchesFormId}--drag-and-drop`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Upload Patches" />
      <ModalBody>
        <form
          id={uploadPatchesFormId}
          aria-label="Upload Patches Form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Controller
            control={control}
            name="patchFiles"
            rules={{
              validate: (patchFiles) =>
                patchFiles?.length > 0 ||
                'At least one .ips/.ups/.bps file is required'
            }}
            render={({ field: { name, value }, fieldState: { error } }) => (
              <DragAndDropInput
                ariaLabel="Upload Patches"
                id={`${uploadPatchesFormId}--drag-and-drop`}
                onDrop={onDrop}
                name={name}
                validFileExtensions={validFileExtensions}
                error={error?.message}
                hideAcceptedFiles={!value?.length}
                multiple
              >
                <p>Drag and drop patch files here, or click to upload files</p>
              </DragAndDropInput>
            )}
          />
        </form>
      </ModalBody>
      <ModalFooter>
        <Button form={uploadPatchesFormId} type="submit" variant="contained">
          Upload
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedUploadPatchesTour"
      />
    </>
  );
};
