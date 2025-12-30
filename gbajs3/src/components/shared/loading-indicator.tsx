import { useTheme , styled } from '@mui/material/styles';
import { PacmanLoader } from 'react-spinners';

import type { ReactNode } from 'react';
import type { LoaderSizeMarginProps } from 'react-spinners/helpers/props';

type LoadingIndicatorProps = {
  children: ReactNode;
  currentName: string | null;
  indicator: ReactNode;
  isLoading: boolean;
  loadingCopy: string;
};

const LoadingContainer = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  align-items: center;
  margin-bottom: 15px;
`;

const BreakWord = styled('p')`
  word-wrap: break-word;
  max-width: 100%;
`;

export const PacmanIndicator = (props: LoaderSizeMarginProps) => {
  const theme = useTheme();

  return (
    <PacmanLoader
      color={theme.gbaThemeBlue}
      cssOverride={{ margin: '0 auto' }}
      {...props}
    />
  );
};

export const LoadingIndicator = ({
  children,
  currentName,
  indicator,
  isLoading,
  loadingCopy
}: LoadingIndicatorProps) => {
  return isLoading ? (
    <LoadingContainer>
      <BreakWord>
        {loadingCopy}
        <br />
        {currentName}
      </BreakWord>
      {indicator}
    </LoadingContainer>
  ) : (
    children
  );
};
