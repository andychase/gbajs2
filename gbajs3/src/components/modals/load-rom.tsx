import { Button } from '@mui/material';
import { useState, useId } from 'react';
import { BiError } from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useAddCallbacks } from '../../hooks/emulator/use-add-callbacks.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { useListRoms } from '../../hooks/use-list-roms.tsx';
import { useLoadRom } from '../../hooks/use-load-rom.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import {
  LoadingIndicator,
  PacmanIndicator
} from '../shared/loading-indicator.tsx';
import { CenteredText } from '../shared/styled.tsx';

type RomErrorProps = {
  $withMarginTop?: boolean;
  $isCentered?: boolean;
};

const LoadRomButton = styled.button`
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

const RomList = styled.ul`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-child > ${LoadRomButton} {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child > ${LoadRomButton} {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-child) > ${LoadRomButton} {
    border-top-width: 0;
  }
`;

const RomError = styled(ErrorWithIcon)<RomErrorProps>`
  ${({ $withMarginTop = false }) =>
    $withMarginTop &&
    `
    margin-top: 15px;
    `}

  ${({ $isCentered = false }) =>
    $isCentered &&
    `
      justify-content: center;
      `}
`;

export const LoadRomModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const romListId = useId();
  const runGame = useRunGame();
  const [currentRomLoading, setCurrentRomLoading] = useState<string | null>(
    null
  );
  const { syncActionIfEnabled } = useAddCallbacks();
  const {
    data: romList,
    isPending: romListLoading,
    error: romListError,
    isPaused: romListPaused
  } = useListRoms();
  const {
    isPending: romLoading,
    error: romLoadError,
    mutate: executeLoadRom
  } = useLoadRom({
    onSuccess: (file) => {
      const runCallback = async () => {
        await syncActionIfEnabled();
        runGame(file.name);
      };

      emulator?.uploadRom(file, runCallback);
      setCurrentRomLoading(null);
    }
  });

  return (
    <>
      <ModalHeader title="Load Rom" />
      <ModalBody>
        {romListLoading ? (
          <PacmanIndicator />
        ) : (
          <LoadingIndicator
            currentName={currentRomLoading}
            indicator={<PacmanIndicator />}
            isLoading={romLoading}
            loadingCopy="Loading rom:"
          >
            <RomList id={romListId}>
              {romList?.map((rom: string, idx: number) => (
                <StyledLi key={`${rom}_${idx}`}>
                  <LoadRomButton
                    onClick={() => {
                      setCurrentRomLoading(rom);
                      executeLoadRom({ romName: rom });
                    }}
                  >
                    {rom}
                  </LoadRomButton>
                </StyledLi>
              ))}
              {!romList?.length && !romListError && (
                <li>
                  <CenteredText>
                    No roms on the server, load a game and send your rom to the
                    server
                  </CenteredText>
                </li>
              )}
            </RomList>
          </LoadingIndicator>
        )}
        {romListPaused && (
          <RomError
            $isCentered
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Requests will resume once online"
          />
        )}
        {!!romListError && (
          <RomError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text="Listing roms has failed"
          />
        )}
        {!!romLoadError && (
          <RomError
            icon={<BiError style={{ color: theme.errorRed }} />}
            text={`Loading rom has failed`}
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
