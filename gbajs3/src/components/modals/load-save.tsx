import { Button } from '@mui/material';
import { useState, useId } from 'react';
import { BiError } from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useListSaves } from '../../hooks/use-list-saves.tsx';
import { useLoadSave } from '../../hooks/use-load-save.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import {
  LoadingIndicator,
  PacmanIndicator
} from '../shared/loading-indicator.tsx';
import { CenteredText } from '../shared/styled.tsx';

type SaveErrorProps = {
  $withMarginTop?: boolean;
};

const LoadSaveButton = styled.button`
  padding: 0.5rem 1rem;
  width: 100%;
  color: ${({ theme }) => theme.blueCharcoal};
  text-decoration: none;
  background-color: ${({ theme }) => theme.pureWhite};
  border: 1px solid rgba(0, 0, 0, 0.125);
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.darkGrayBlue};
    background-color: ${({ theme }) => theme.aliceBlue1};
  }
`;

const StyledLi = styled.li`
  cursor: pointer;
`;

const SaveList = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-child > ${LoadSaveButton} {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child > ${LoadSaveButton} {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-child) > ${LoadSaveButton} {
    border-top-width: 0;
  }
`;

const SaveError = styled(ErrorWithIcon)<SaveErrorProps>`
  ${({ $withMarginTop = false }) =>
    $withMarginTop &&
    `
    margin-top: 15px;
    `}
  justify-content: center;
`;

export const LoadSaveModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const saveListId = useId();
  const { syncActionIfEnabled } = useAddCallbacks();
  const {
    data: saveList,
    isPending: saveListLoading,
    error: saveListError,
    isPaused: saveListPaused
  } = useListSaves();
  const {
    isPending: saveLoading,
    error: saveLoadError,
    mutate: executeLoadSave
  } = useLoadSave({
    onSuccess: (file) => {
      emulator?.uploadSaveOrSaveState(file, syncActionIfEnabled);
      setCurrentSaveLoading(null);
    }
  });
  const [currentSaveLoading, setCurrentSaveLoading] = useState<string | null>(
    null
  );

  return (
    <>
      <ModalHeader title="Load Save" />
      <ModalBody>
        {saveListLoading ? (
          <PacmanIndicator />
        ) : (
          <LoadingIndicator
            isLoading={saveLoading}
            currentName={currentSaveLoading}
            indicator={<PacmanIndicator />}
            loadingCopy="Loading save:"
          >
            <SaveList id={saveListId}>
              {saveList?.map((save: string, idx: number) => (
                <StyledLi key={`${save}_${idx}`}>
                  <LoadSaveButton
                    onClick={() => {
                      setCurrentSaveLoading(save);

                      executeLoadSave({ saveName: save });
                    }}
                  >
                    {save}
                  </LoadSaveButton>
                </StyledLi>
              ))}
              {!saveList?.length && !saveListError && (
                <li>
                  <CenteredText>
                    No saves on the server, load a game and send your save to
                    the server
                  </CenteredText>
                </li>
              )}
            </SaveList>
          </LoadingIndicator>
        )}
        {saveListPaused && (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Requests will resume once online"
          />
        )}
        {!!saveListError && (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Listing saves has failed"
          />
        )}
        {!!saveLoadError && (
          <SaveError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text={`Loading save has failed`}
            $withMarginTop
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
