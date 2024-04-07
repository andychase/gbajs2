import Modal from 'react-modal';

import { useEmulatorContext, useModalContext } from '../../hooks/context.tsx';

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
    flexDirection: 'column' as const,
    userSelect: 'text' as const
  }
};

export const ModalContainer = () => {
  const { modalContent, isModalOpen, setIsModalOpen } = useModalContext();
  const { emulator } = useEmulatorContext();

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
