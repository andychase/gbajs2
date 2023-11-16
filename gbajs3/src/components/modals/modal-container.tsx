import { useContext } from 'react';
import Modal from 'react-modal';

import { EmulatorContext } from '../../context/emulator/emulator.tsx';
import { ModalContext } from '../../context/modal/modal.tsx';

const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 400
  },
  content: {
    width: 'calc(100dvw - 20px)',
    height: 'fit-content',
    margin: '25px auto auto auto',
    backgroundColor: '#fff',
    inset: '10px',
    maxWidth: '500px',
    padding: '0',
    maxHeight: '90dvh',
    display: 'flex',
    flexDirection: 'column' as const
  }
};

export const ModalContainer = () => {
  const { modalContent, isModalOpen, setIsModalOpen } =
    useContext(ModalContext);
  const { emulator } = useContext(EmulatorContext);

  return (
    <Modal
      appElement={document.getElementById('root') || undefined}
      closeTimeoutMS={400}
      isOpen={isModalOpen}
      style={modalStyles}
      onRequestClose={() => setIsModalOpen(false)}
      onAfterOpen={emulator?.disableKeyboardInput}
      onAfterClose={emulator?.enableKeyboardInput}
      aria={{ labelledby: 'modalHeader' }}
    >
      {modalContent}
    </Modal>
  );
};
