import { Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useId } from 'react';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';
import { useRunGame } from '../../hooks/emulator/use-run-game.tsx';
import { CenteredText } from '../shared/styled.tsx';

const LoadRomButton = styled('button')`
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

const StyledLi = styled('li')`
  cursor: pointer;
`;

const RomList = styled('ul')`
  list-style-type: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  & > ${StyledLi}:first-of-type > ${LoadRomButton} {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  & > ${StyledLi}:last-child > ${LoadRomButton} {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  & > ${StyledLi}:not(:first-of-type) > ${LoadRomButton} {
    border-top-width: 0;
  }
`;

export const LoadLocalRomModal = () => {
  const { setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();
  const romListId = useId();
  const runGame = useRunGame();
  const localRoms = emulator?.listRoms();

  return (
    <>
      <ModalHeader title="Load Local Rom" />
      <ModalBody>
        <RomList id={romListId}>
          {localRoms?.map((romName: string, idx: number) => (
            <StyledLi key={`${romName}_${idx}`}>
              <LoadRomButton
                onClick={() => {
                  runGame(romName);
                  setIsModalOpen(false);
                }}
              >
                {romName}
              </LoadRomButton>
            </StyledLi>
          ))}
          {!localRoms?.length && (
            <li>
              <CenteredText>
                No local roms, load a game and save your file system
              </CenteredText>
            </li>
          )}
        </RomList>
      </ModalBody>
      <ModalFooter>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
