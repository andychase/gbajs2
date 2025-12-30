import { styled } from '@mui/material/styles';

import type { ComponentProps } from 'react';

const StyledButton = styled('button')`
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  padding: inherit;
`;

export const ButtonBase = ({
  children,
  ref,
  ...rest
}: ComponentProps<'button'>) => (
  <StyledButton ref={ref} {...rest}>
    {children}
  </StyledButton>
);
