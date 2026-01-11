import { Button, Collapse, IconButton } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useMemo, useState } from 'react';
import { BiError, BiTrash } from 'react-icons/bi';
import { FaRegEye } from 'react-icons/fa';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useFileStat } from '../../hooks/emulator/use-file-stat.tsx';
import { saveStateSlotsLocalStorageKey } from '../controls/consts.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { NumberInput } from '../shared/number-input.tsx';
import { CenteredText, StyledBiPlus } from '../shared/styled.tsx';

export type CurrentSaveStateSlots = Record<string, number>;

type SaveStateListItemProps = {
  key: string;
  saveStateName: string;
  previewDataUrl?: string;
  isSaveStatePreviewSelected: boolean;
  onSaveStatePreviewSelected: () => void;
  onClick?: () => void;
  onDelete: () => void;
};

const LoadSaveStateButton = styled('button')`
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

const StyledLi = styled('li')`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.blueCharcoal};
  background-color: ${({ theme }) => theme.pureWhite};
  border: 1px solid rgba(0, 0, 0, 0.125);
`;

const ButtonGrid = styled('div')`
  cursor: pointer;
  display: grid;
  grid-template-columns: auto 32px 32px;
  gap: 10px;
`;

const SaveStatesList = styled('ul')`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-of-type {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-of-type) {
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

const StateSlotContainer = styled('div')`
  border-bottom: 1px solid ${({ theme }) => theme.pattensBlue};
  margin-bottom: 16px;
  padding-bottom: 16px;
`;

const SaveStatePreview = styled('img')`
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  image-rendering: pixelated;
`;

const uint8ArrayToBase64DataUrl = (binary?: Uint8Array) =>
  binary?.length
    ? `data:image/png;base64,${btoa(
        Array.from(binary, (b) => String.fromCharCode(b)).join('')
      )}`
    : undefined;

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
        .filter((url): url is string => url !== undefined),
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

  const autoSaveStatePath = emulator?.getCurrentAutoSaveStatePath();
  const { trigger } = useFileStat(autoSaveStatePath);

  const toggleCurrentSaveStatePreview = (saveStateName: string) => {
    setCurrentSaveStatePreview(
      currentSaveStatePreview === saveStateName ? null : saveStateName
    );
  };

  return (
    <>
      <ModalHeader title="Manage Save States" />
      <ModalBody>
        <StateSlotContainer>
          <NumberInput
            label="Current Save State Slot"
            size="small"
            min={0}
            value={currentSaveStateSlot}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                onChange: (p) => {
                  setCurrentSaveStateSlot(Number(p.target.value));
                }
              }
            }}
            sx={{ width: '100%' }}
          />
        </StateSlotContainer>

        <SaveStatesList>
          {autoSaveStateNameWithoutPath && (
            <SaveStateListItem
              key={autoSaveStateNameWithoutPath}
              saveStateName={autoSaveStateNameWithoutPath}
              previewDataUrl={autoSaveStateImage}
              isSaveStatePreviewSelected={
                currentSaveStatePreview === autoSaveStateNameWithoutPath
              }
              onSaveStatePreviewSelected={() => {
                toggleCurrentSaveStatePreview(autoSaveStateNameWithoutPath);
              }}
              onClick={emulator?.loadAutoSaveState}
              onDelete={() => {
                if (autoSaveStateData?.autoSaveStateName) {
                  emulator?.deleteFile(autoSaveStateData.autoSaveStateName);
                  trigger();
                }
              }}
            />
          )}
          {currentSaveStates?.map((saveState: string, idx: number) => (
            <SaveStateListItem
              key={`${saveState}_${idx}`}
              saveStateName={saveState}
              previewDataUrl={saveStateImageUrls?.[idx]}
              isSaveStatePreviewSelected={currentSaveStatePreview === saveState}
              onSaveStatePreviewSelected={() => {
                toggleCurrentSaveStatePreview(saveState);
              }}
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
              onDelete={async () => {
                const slot = parseSaveStateSlot(saveState);
                if (slot !== null) {
                  emulator?.deleteSaveState(slot);
                  refreshSaveStates();
                  await syncActionIfEnabled();
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
          aria-label={`Create new save state`}
          sx={{ padding: 0 }}
          onClick={async () => {
            const nextSaveStateSlot = currentSaveStateSlot + 1;
            const hasCreatedSaveState =
              emulator?.createSaveState(nextSaveStateSlot);
            if (hasCreatedSaveState) {
              refreshSaveStates();
              setCurrentSaveStateSlot(nextSaveStateSlot);
              setSaveStateError(null);
              await syncActionIfEnabled();
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
        <Button
          variant="outlined"
          onClick={() => {
            setIsModalOpen(false);
          }}
        >
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
