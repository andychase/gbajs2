import { forwardRef, type ReactNode } from 'react';
import { styled } from 'styled-components';

type ButtonBaseProps = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const StyledButton = styled.button`
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  padding: inherit;
`;

export const ButtonBase = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ children, ...rest }, ref) => (
    <StyledButton ref={ref} {...rest}>
      {children}
    </StyledButton>
  )
);
