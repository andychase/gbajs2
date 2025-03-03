import { IconButton } from '@mui/material';
import { useTheme } from 'styled-components';

import { PanelControlWrapper, PanelControlButton } from './styled.tsx';

import type { IconButtonProps } from '@mui/material';
import type { ReactNode } from 'react';

type PanelButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  controlled: boolean;
  id: string;
  $gridArea?: string;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
};

type SliderButtonProps = {
  icon: ReactNode;
} & IconButtonProps;

export const PanelButton = ({
  ariaLabel,
  children,
  className,
  controlled,
  id,
  $gridArea,
  onClick,
  onPointerDown,
  onPointerUp
}: PanelButtonProps) => (
  <PanelControlWrapper>
    <PanelControlButton
      aria-label={ariaLabel}
      id={id}
      className={className}
      onClick={onClick}
      $controlled={controlled}
      $gridArea={$gridArea}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </PanelControlButton>
  </PanelControlWrapper>
);

export const SliderButton = ({ icon, ...rest }: SliderButtonProps) => {
  const theme = useTheme();

  return (
    <IconButton
      size="small"
      sx={{
        padding: 0,
        color: theme.pureBlack,
        '&:active': { color: theme.gbaThemeBlue }
      }}
      {...rest}
    >
      {icon}
    </IconButton>
  );
};
