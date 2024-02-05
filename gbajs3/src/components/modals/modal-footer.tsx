import { styled } from 'styled-components';

import type { ReactNode } from 'react';

type ModalFooterProps = {
  children: ReactNode;
};

const FooterWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid ${({ theme }) => theme.pattensBlue};
  padding: 1rem 1rem;
`;

export const ModalFooter = ({ children }: ModalFooterProps) => {
  return (
    <FooterWrapper data-testid="modal-footer:wrapper">{children}</FooterWrapper>
  );
};
