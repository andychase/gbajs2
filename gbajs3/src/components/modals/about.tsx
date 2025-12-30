import { Button, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BiCheckCircle } from 'react-icons/bi';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useModalContext } from '../../hooks/context.tsx';

const FlexWrapper = styled('div')`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`;

export const AboutModal = () => {
  const { setIsModalOpen } = useModalContext();
  const releaseVersion = import.meta.env.VITE_GBA_RELEASE_VERSION;

  return (
    <>
      <ModalHeader title="About" />
      <ModalBody>
        <p>
          Gbajs3 is a full featured Game Boy Advance emulator meant to operate
          online and offline in the browser.
        </p>
        <p>
          We currently support the mGBA core through the use of webassembly.
        </p>
        <p>Getting Started:</p>
        <ul>
          <li>
            Using the <i>Pre Game Actions</i> menu, upload a sav file if you
            have one available
          </li>
          <li>
            Then, load a rom of your choice through the <i>Upload Rom</i> or{' '}
            <i>Load Local Rom</i> menu items
          </li>
          <li>Enjoy, your game will boot!</li>
        </ul>
        <p>
          See the{' '}
          <a href="https://github.com/thenick775/gbajs3/wiki" target="_blank">
            WIKI
          </a>{' '}
          and tour items for further information!
        </p>
        {releaseVersion && (
          <FlexWrapper>
            <Chip
              label={`Version ${releaseVersion}`}
              component="a"
              target="_blank"
              href={`https://github.com/thenick775/gbajs3/releases/tag/${releaseVersion}`}
              size="small"
              icon={<BiCheckCircle />}
              clickable
            />
          </FlexWrapper>
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
