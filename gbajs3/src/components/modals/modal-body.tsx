import { BodyWrapper } from '../shared/styled.tsx';

import type { ReactNode } from 'react';

type ModalBodyProps = {
  children: ReactNode;
};

export const ModalBody = ({ children }: ModalBodyProps) => {
  return <BodyWrapper>{children}</BodyWrapper>;
};
