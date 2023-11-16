import React, { type ReactNode } from 'react';
import { styled } from 'styled-components';

type ButtonBaseProps = {
  children?: ReactNode;
  id?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const StyledButton = styled.button`
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  padding: inherit;
`;

export const ButtonBase = React.forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ children, ...rest }, ref) => {
    return (
      <StyledButton ref={ref} {...rest}>
        {children}
      </StyledButton>
    );
  }
);
