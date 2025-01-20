import {
  tooltipClasses,
  Tooltip,
  ClickAwayListener,
  useMediaQuery
} from '@mui/material';
import { forwardRef, useState } from 'react';
import { useTheme } from 'styled-components';

import {
  ContentSpan,
  MutedMarkSlider,
  PanelControlButton,
  PanelControlSlider,
  PanelControlWrapper
} from './styled.tsx';

import type { SliderProps as MUISliderProps } from '@mui/material';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

type SliderProps = {
  controlled: boolean;
  disablePointerEvents: boolean;
  gridArea: string;
  maxIcon: ReactNode;
  minIcon: ReactNode;
} & MUISliderProps;

type PanelSliderProps = SliderProps & {
  ButtonIcon: IconType;
};

const popperStyles = {
  [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
    {
      marginTop: '16px'
    },
  [`&.${tooltipClasses.popper}[data-popper-placement*="top"] .${tooltipClasses.tooltip}`]:
    {
      marginBottom: '16px'
    },
  [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]:
    {
      marginLeft: '16px'
    },
  [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]:
    {
      marginRight: '16px'
    }
};

const Slider = forwardRef<HTMLSpanElement, SliderProps>(
  (
    {
      controlled,
      disablePointerEvents,
      gridArea,
      id,
      maxIcon,
      minIcon,
      ...rest
    },
    ref
  ) => (
    <PanelControlWrapper>
      <ContentSpan ref={ref}>
        <PanelControlSlider
          id={id}
          $gridArea={gridArea}
          $controlled={controlled}
        >
          {minIcon}
          <MutedMarkSlider
            marks
            sx={{
              width: '85px',
              margin: '0 10px',
              maxHeight: '40px',
              pointerEvents: disablePointerEvents ? 'none' : undefined
            }}
            valueLabelDisplay="auto"
            {...rest}
          />
          {maxIcon}
        </PanelControlSlider>
      </ContentSpan>
    </PanelControlWrapper>
  )
);

export const PanelSlider = ({ ButtonIcon, ...rest }: PanelSliderProps) => {
  const theme = useTheme();
  const isMobileLandscape = useMediaQuery(theme.isMobileLandscape);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  return isMobileLandscape ? (
    <Tooltip
      open={isTooltipOpen}
      title={
        <ClickAwayListener onClickAway={() => setIsTooltipOpen(false)}>
          <Slider {...rest} />
        </ClickAwayListener>
      }
      arrow
      slotProps={{
        popper: {
          sx: popperStyles
        },
        tooltip: { sx: { padding: '8px 16px' } }
      }}
      placement="bottom-end"
    >
      <PanelControlButton
        onClick={() => setIsTooltipOpen((prevState) => !prevState)}
        $controlled={rest.controlled}
      >
        <ButtonIcon style={{ maxHeight: '100%' }} />
      </PanelControlButton>
    </Tooltip>
  ) : (
    <Slider {...rest} />
  );
};
