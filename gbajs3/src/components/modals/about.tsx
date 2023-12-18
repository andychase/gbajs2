import { Button } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useContext } from 'react';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { ModalContext } from '../../context/modal/modal.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { CompletedProductTourSteps } from '../product-tour/product-tour-intro.tsx';

export const AboutModal = () => {
  const { setIsModalOpen } = useContext(ModalContext);
  const [, setHasCompletedProductTourSteps] = useLocalStorage<
    CompletedProductTourSteps | undefined
  >(productTourLocalStorageKey);

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
      </ModalBody>
      <ModalFooter>
        <Button
          variant="contained"
          onClick={() => {
            setHasCompletedProductTourSteps({});
            setIsModalOpen(false);
          }}
        >
          Take a tour
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
