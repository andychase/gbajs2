import { Button, Collapse, IconButton } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useId, useMemo, useState } from 'react';
import { BiError, BiTrash } from 'react-icons/bi';
import { FaRegEye } from 'react-icons/fa';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { saveStateSlotsLocalStorageKey } from '../controls/consts.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { NumberInput } from '../shared/number-input.tsx';
import { CenteredText, StyledBiPlus } from '../shared/styled.tsx';

export type CurrentSaveStateSlots = {
  [romName: string]: number;
};

type SaveStateListItemProps = {
  key: string;
  saveStateName: string;
  previewDataUrl?: string;
  isSaveStatePreviewSelected: boolean;
  onSaveStatePreviewSelected: () => void;
  onClick?: () => void;
  onDelete: () => void;
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
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: 1px solid rgba(0, 0, 0, 0.125);
`;

const ButtonGrid = styled.div`
  cursor: pointer;
  display: grid;
  grid-template-columns: auto 32px 32px;
  gap: 10px;
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

const StyledBiTrash = styled(BiTrash)`
  height: 100%;
  width: 20px;
`;

const StyledFaRegEye = styled(FaRegEye)`
  height: 100%;
  width: 20px;
`;

const StateSlotContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.pattensBlue};
  margin-bottom: 16px;
  padding-bottom: 16px;
`;

const SaveStatePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  image-rendering: pixelated;
`;

const uint8ArrayToBase64DataUrl = (binary?: Uint8Array) => {
  if (binary?.length) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(binary)));
    return `data:image/png;base64,${base64}`;
  }
  return undefined;
};

const parseSaveStateSlot = (saveStateName: string) => {
  const ext = saveStateName.split('.').pop();
  const slotString = ext?.replace('ss', '');

  if (!slotString) return null;

  const slot = parseInt(slotString);

  return !isNaN(slot) ? slot : null;
};

const SaveStateListItem = ({
  saveStateName,
  previewDataUrl,
  isSaveStatePreviewSelected,
  onSaveStatePreviewSelected,
  onClick,
  onDelete
}: SaveStateListItemProps) => (
  <StyledLi>
    <ButtonGrid>
      <LoadSaveStateButton onClick={onClick}>
        {saveStateName}
      </LoadSaveStateButton>
      <IconButton
        aria-label={`${
          isSaveStatePreviewSelected ? 'Close' : 'View'
        } ${saveStateName}`}
        sx={{ padding: 0 }}
        onClick={onSaveStatePreviewSelected}
      >
        <StyledFaRegEye />
      </IconButton>
      <IconButton
        aria-label={`Delete ${saveStateName}`}
        sx={{ padding: 0 }}
        onClick={onDelete}
      >
        <StyledBiTrash />
      </IconButton>
    </ButtonGrid>
    <Collapse in={isSaveStatePreviewSelected}>
      <SaveStatePreview src={previewDataUrl} alt={`${saveStateName} Preview`} />
    </Collapse>
  </StyledLi>
);

export const SaveStatesModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const [currentSaveStates, setCurrentSaveStates] = useState<
    string[] | undefined
  >(emulator?.listCurrentSaveStates);
  const [saveStateError, setSaveStateError] = useState<string | null>(null);
  const [currentSlots, setCurrentSlots] =
    useLocalStorage<CurrentSaveStateSlots>(saveStateSlotsLocalStorageKey, {});
  const { syncActionIfEnabled } = useAddCallbacks();
  const baseId = useId();
  const [currentSaveStatePreview, setCurrentSaveStatePreview] = useState<
    string | null
  >(null);

  const refreshSaveStates = useCallback(() => {
    const saveStatesList = emulator?.listCurrentSaveStates();

    setCurrentSaveStates(saveStatesList);
  }, [emulator]);

  const saveStateImageUrls = useMemo(
    () =>
      currentSaveStates
        ?.map((saveState) => {
          const binary = emulator?.getSaveState(saveState);
          return uint8ArrayToBase64DataUrl(binary);
        })
        .filter((url): url is string => url !== null),
    [emulator, currentSaveStates]
  );

  const currentGameName = emulator?.getCurrentGameName();
  const currentSaveStateSlot = currentGameName
    ? currentSlots[currentGameName] ?? 0
    : 0;

  const setCurrentSaveStateSlot = (slot: number) => {
    if (currentGameName)
      setCurrentSlots((prevState) => ({
        ...prevState,
        [currentGameName]: slot
      }));
  };

  const autoSaveStateData = emulator?.getAutoSaveState();
  const autoSaveStateNameWithoutPath = autoSaveStateData?.autoSaveStateName
    .split('/')
    .pop();
  const autoSaveStateImage = uint8ArrayToBase64DataUrl(autoSaveStateData?.data);

  const toggleCurrentSaveStatePreview = (saveStateName: string) =>
    setCurrentSaveStatePreview(
      currentSaveStatePreview === saveStateName ? null : saveStateName
    );

  const tourSteps: TourSteps = [
    {
      content: (
        <p>
          Use this input to manually update the current save state slot in use.
        </p>
      ),
      placementBeacon: 'bottom-end',
      target: `#${CSS.escape(`${baseId}--save-state-slot`)}`
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
        <StateSlotContainer>
          <NumberInput
            id={`${baseId}--save-state-slot`}
            label="Current Save State Slot"
            size="small"
            min={0}
            value={currentSaveStateSlot}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                onChange: (p) => setCurrentSaveStateSlot(Number(p.target.value))
              }
            }}
            sx={{ width: '100%' }}
          />
        </StateSlotContainer>

        <SaveStatesList id={`${baseId}--save-state-list`}>
          {autoSaveStateNameWithoutPath && (
            <SaveStateListItem
              key={autoSaveStateNameWithoutPath}
              saveStateName={autoSaveStateNameWithoutPath}
              previewDataUrl={autoSaveStateImage}
              isSaveStatePreviewSelected={
                currentSaveStatePreview === autoSaveStateNameWithoutPath
              }
              onSaveStatePreviewSelected={() =>
                toggleCurrentSaveStatePreview(autoSaveStateNameWithoutPath)
              }
              onClick={emulator?.loadAutoSaveState}
              onDelete={() => {
                if (autoSaveStateData?.autoSaveStateName)
                  emulator?.deleteFile(autoSaveStateData.autoSaveStateName);
              }}
            />
          )}
          {currentSaveStates?.map((saveState: string, idx: number) => (
            <SaveStateListItem
              key={`${saveState}_${idx}`}
              saveStateName={saveState}
              previewDataUrl={saveStateImageUrls?.[idx]}
              isSaveStatePreviewSelected={currentSaveStatePreview === saveState}
              onSaveStatePreviewSelected={() =>
                toggleCurrentSaveStatePreview(saveState)
              }
              onClick={() => {
                const slot = parseSaveStateSlot(saveState);
                if (slot !== null) {
                  const hasLoadedSaveState = emulator?.loadSaveState(slot);
                  if (hasLoadedSaveState && currentGameName) {
                    setCurrentSlots((prevState) => ({
                      ...prevState,
                      [currentGameName]: slot
                    }));
                    setSaveStateError(null);
                  } else {
                    setSaveStateError('Failed to load save state');
                  }
                }
              }}
              onDelete={() => {
                const slot = parseSaveStateSlot(saveState);
                if (slot !== null) {
                  emulator?.deleteSaveState(slot);
                  refreshSaveStates();
                  syncActionIfEnabled();
                }
              }}
            />
          ))}
          {!autoSaveStateNameWithoutPath && !currentSaveStates?.length && (
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
            const nextSaveStateSlot = currentSaveStateSlot + 1;
            const hasCreatedSaveState =
              emulator?.createSaveState(nextSaveStateSlot);
            if (hasCreatedSaveState) {
              refreshSaveStates();
              setCurrentSaveStateSlot(nextSaveStateSlot);
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
