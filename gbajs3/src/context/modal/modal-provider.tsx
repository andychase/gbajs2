import { useState, type ReactNode, type JSX } from 'react';

import { ModalContext } from './modal-context.tsx';

type ModalProviderProps = {
  children: ReactNode;
};

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [modalContent, setModalContent] = useState<JSX.Element | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{ modalContent, setModalContent, isModalOpen, setIsModalOpen }}
    >
      {children}
    </ModalContext.Provider>
  );
};
