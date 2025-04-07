import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { styled } from 'styled-components';

const StyledButton = styled.button`
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  padding: inherit;
`;

export const ButtonBase = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...rest }, ref) => (
  <StyledButton ref={ref} {...rest}>
    {children}
  </StyledButton>
));
