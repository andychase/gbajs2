import { styled } from 'styled-components';

import { Copy } from './styled.tsx';

import type { JSX } from 'react';

type ErrorWithIconProps = {
  text: string;
  icon: JSX.Element;
  className?: string;
};

const ErrorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const ErrorText = styled(Copy)`
  color: ${({ theme }) => theme.errorRed};
`;

export const ErrorWithIcon = ({
  icon,
  text,
  className
}: ErrorWithIconProps) => {
  return (
    <ErrorWrapper data-testid="error-with-icon" className={className}>
      {icon}
      <ErrorText>{text}</ErrorText>
    </ErrorWrapper>
  );
};
