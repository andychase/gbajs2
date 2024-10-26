import { createContext } from 'react';

import type { Dispatch, SetStateAction } from 'react';

type ModalContextProps = {
  modalContent: JSX.Element | null;
  setModalContent: Dispatch<SetStateAction<JSX.Element | null>>;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
};

export const ModalContext = createContext<ModalContextProps | null>(null);

ModalContext.displayName = 'ModalContext';
