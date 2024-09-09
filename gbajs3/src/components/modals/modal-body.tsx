import { BodyWrapper } from '../shared/styled.tsx';

import type { ReactNode } from 'react';

type ModalBodyProps = {
  children: ReactNode;
  className?: string;
};

export const ModalBody = ({ children, className }: ModalBodyProps) => {
  return <BodyWrapper className={className}>{children}</BodyWrapper>;
};
