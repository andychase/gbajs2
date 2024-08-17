import { FooterWrapper } from '../shared/styled.tsx';

import type { ReactNode } from 'react';

type ModalFooterProps = {
  children: ReactNode;
};

export const ModalFooter = ({ children }: ModalFooterProps) => {
  return (
    <FooterWrapper data-testid="modal-footer:wrapper">{children}</FooterWrapper>
  );
};
