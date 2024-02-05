import {
  createContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction
} from 'react';

type ModalContextProps = {
  modalContent: JSX.Element | null;
  setModalContent: Dispatch<SetStateAction<JSX.Element | null>>;
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
};

type ModalProviderProps = { children: ReactNode };

export const ModalContext = createContext<ModalContextProps | null>(null);

ModalContext.displayName = 'ModalContext';

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [modalContent, setModalContent] =
    useState<ModalContextProps['modalContent']>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{ modalContent, setModalContent, isModalOpen, setIsModalOpen }}
    >
      {children}
    </ModalContext.Provider>
  );
};
