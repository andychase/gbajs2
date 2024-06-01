import { Button } from '@mui/material';
import { useEffect, useState, useId, type ReactNode } from 'react';
import { BiError } from 'react-icons/bi';
import { PacmanLoader } from 'react-spinners';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useListSaves } from '../../hooks/use-list-saves.tsx';
import { useLoadSave } from '../../hooks/use-load-save.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { CenteredText } from '../shared/styled.tsx';

type SaveLoadingIndicatorProps = {
  isLoading: boolean;
  currentLoadingSave: string | null;
  children: JSX.Element;
  indicator: ReactNode;
};

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

const SaveLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  align-items: center;
  margin-bottom: 15px;
`;

const SaveError = styled(ErrorWithIcon)<SaveErrorProps>`
  ${({ $withMarginTop = false }) =>
    $withMarginTop &&
    `
    margin-top: 15px;
    `}
`;

const SaveLoadingIndicator = ({
  isLoading,
  currentLoadingSave,
  children,
  indicator
}: SaveLoadingIndicatorProps) => {
  return isLoading ? (
    <SaveLoadingContainer>
      <p>
        Loading save:
        <br />
        {currentLoadingSave}
      </p>
      {indicator}
    </SaveLoadingContainer>
  ) : (
    children
  );
};

export const LoadSaveModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const saveListId = useId();
  const {
    data: saveList,
    isLoading: saveListLoading,
    error: saveListError
  } = useListSaves({ loadOnMount: true });
  const {
    data: saveFile,
    isLoading: saveLoading,
    error: saveLoadError,
    execute: executeLoadSave
  } = useLoadSave();
  const [currentSaveLoading, setCurrentSaveLoading] = useState<string | null>(
    null
  );

  const shouldUploadSave = !saveLoading && !!saveFile && !!currentSaveLoading;

  useEffect(() => {
    if (shouldUploadSave) {
      emulator?.uploadSaveOrSaveState(saveFile);
      setCurrentSaveLoading(null);
    }
  }, [emulator, shouldUploadSave, saveFile]);

  const LoadingIndicator = () => (
    <PacmanLoader
      color={theme.gbaThemeBlue}
      cssOverride={{ margin: '0 auto' }}
    />
  );

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use this area to load save files from the server. Once the list has
            loaded, click a row to load the save.
          </p>
          <p>You may load multiple save files in a row!</p>
        </>
      ),
      target: `#${CSS.escape(saveListId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Load Save" />
      <ModalBody>
        {saveListLoading ? (
          <LoadingIndicator />
        ) : (
          <SaveLoadingIndicator
            isLoading={saveLoading}
            currentLoadingSave={currentSaveLoading}
            indicator={<LoadingIndicator />}
          >
            <SaveList id={saveListId}>
              {saveList?.map?.((save: string, idx: number) => (
                <StyledLi key={`${save}_${idx}`}>
                  <LoadSaveButton
                    onClick={() => {
                      executeLoadSave({ saveName: save });
                      setCurrentSaveLoading(save);
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
          </SaveLoadingIndicator>
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
      <EmbeddedProductTour
        skipRenderCondition={
          saveLoading || saveListLoading || !!saveListError || !!saveLoadError
        }
        steps={tourSteps}
        completedProductTourStepName="hasCompletedLoadSaveTour"
      />
    </>
  );
};
