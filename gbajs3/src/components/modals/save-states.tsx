import { Button, IconButton } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useEffect, useId, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { BiError, BiTrash } from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { saveStateSlotLocalStorageKey } from '../controls/consts.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { CircleCheckButton } from '../shared/circle-check-button.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { NumberInput } from '../shared/number-input.tsx';
import { CenteredText, StyledBiPlus } from '../shared/styled.tsx';

type InputProps = {
  saveStateSlot: number;
};

const LoadSaveStateButton = styled.button`
  padding: 0.5rem 0.5rem;
  width: 100%;
  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: none;
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.darkGrayBlue};
    background-color: ${({ theme }) => theme.aliceBlue1};
  }
`;

const StyledLi = styled.li`
  cursor: pointer;
  display: grid;
  grid-template-columns: auto 32px;
  gap: 10px;

  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: 1px solid rgba(0, 0, 0, 0.125);
`;

const SaveStatesList = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-child) {
    border-top-width: 0;
  }
`;

const StyledCiCircleRemove = styled(BiTrash)`
  height: 100%;
  width: 20px;
`;

const StyledForm = styled.form`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.pattensBlue};
  margin-bottom: 16px;
  padding-bottom: 16px;
`;

export const SaveStatesModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [currentSaveStates, setCurrentSaveStates] = useState<
    string[] | undefined
  >();
  const [saveStateError, setSaveStateError] = useState<string | null>(null);
  const [currentSlot, setCurrentSlot] = useLocalStorage(
    saveStateSlotLocalStorageKey,
    0
  );
  const { syncActionIfEnabled } = useAddCallbacks();
  const baseId = useId();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitSuccessful }
  } = useForm<InputProps>({
    defaultValues: {
      saveStateSlot: currentSlot
    }
  });

  const refreshSaveStates = useCallback(() => {
    const saveStatesList = emulator
      ?.listSaveStates()
      ?.filter((ss) => ss !== '.' && ss !== '..');

    setCurrentSaveStates(saveStatesList);
  }, [emulator]);

  useEffect(() => {
    setValue('saveStateSlot', currentSlot);
  }, [currentSlot, setValue]);

  const onSubmit: SubmitHandler<InputProps> = async (formData) =>
    setCurrentSlot(formData.saveStateSlot);

  const renderedSaveStates =
    currentSaveStates ??
    emulator?.listSaveStates()?.filter((ss) => ss !== '.' && ss !== '..');

  const tourSteps: TourSteps = [
    {
      content: (
        <p>
          Use this input and button to manually update the current save state
          slot in use.
        </p>
      ),
      placementBeacon: 'bottom-end',
      target: `#${CSS.escape(`${baseId}--save-state-slot-form`)}`
    },
    {
      content: (
        <p>
          Tap a row to load a save state, or use the trash can icon to delete a
          save state.
        </p>
      ),
      placementBeacon: 'bottom-end',
      target: `#${CSS.escape(`${baseId}--save-state-list`)}`
    },
    {
      content: (
        <p>
          Use the <i>plus</i> button to add a new save state. This will
          automatically increase the current save state number!
        </p>
      ),
      placementBeacon: 'bottom-end',
      target: `#${CSS.escape(`${baseId}--add-state-button`)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Manage Save States" />
      <ModalBody>
        <StyledForm
          id={`${baseId}--save-state-slot-form`}
          onSubmit={handleSubmit(onSubmit)}
        >
          <NumberInput
            label="Current Save State Slot"
            size="small"
            error={!!errors?.saveStateSlot}
            min={0}
            slotProps={{ inputLabel: { shrink: true } }}
            {...register('saveStateSlot', {
              required: { value: true, message: 'Slot is required' },
              valueAsNumber: true
            })}
          />
          <CircleCheckButton
            copy="Update Slot"
            showSuccess={isSubmitSuccessful}
            size="small"
            type="submit"
            sx={{ maxHeight: '40px', minWidth: 'fit-content' }}
          />
        </StyledForm>

        <SaveStatesList id={`${baseId}--save-state-list`}>
          {renderedSaveStates?.map?.((saveState: string, idx: number) => (
            <StyledLi key={`${saveState}_${idx}`}>
              <LoadSaveStateButton
                onClick={() => {
                  const ext = saveState.split('.').pop();
                  const slotString = ext?.replace('ss', '');
                  if (slotString) {
                    const slot = parseInt(slotString);
                    const hasLoadedSaveState = emulator?.loadSaveState(slot);
                    if (hasLoadedSaveState) {
                      setCurrentSlot(slot);
                      setSaveStateError(null);
                    } else {
                      setSaveStateError('Failed to load save state');
                    }
                  }
                }}
              >
                {saveState}
              </LoadSaveStateButton>
              <IconButton
                aria-label={`Delete ${saveState}`}
                sx={{ padding: 0 }}
                onClick={() => {
                  const ext = saveState.split('.').pop();
                  const slotString = ext?.replace('ss', '');
                  if (slotString) {
                    const slot = parseInt(slotString);
                    emulator?.deleteSaveState(slot);
                    refreshSaveStates();
                    syncActionIfEnabled();
                  }
                }}
              >
                <StyledCiCircleRemove />
              </IconButton>
            </StyledLi>
          ))}
          {!renderedSaveStates?.length && (
            <li>
              <CenteredText>No save states</CenteredText>
            </li>
          )}
        </SaveStatesList>
        <IconButton
          id={`${baseId}--add-state-button`}
          aria-label={`Create new save state`}
          sx={{ padding: 0 }}
          onClick={() => {
            const hasCreatedSaveState = emulator?.createSaveState(
              currentSlot + 1
            );
            if (hasCreatedSaveState) {
              refreshSaveStates();
              setCurrentSlot((prevState) => prevState + 1);
              setSaveStateError(null);
              syncActionIfEnabled();
            } else {
              setSaveStateError('Failed to create save state');
            }
          }}
        >
          <StyledBiPlus />
        </IconButton>
        {saveStateError && (
          <ErrorWithIcon
            icon={<BiError style={{ color: theme.errorRed }} />}
            text={saveStateError}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedSaveStatesTour"
      />
    </>
  );
};
