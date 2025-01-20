import { Slider } from '@mui/material';
import { styled, css } from 'styled-components';

import { ButtonBase } from '../../shared/custom-button-base.tsx';

type ControlledProps = {
  $controlled: boolean;
};

type PanelControlSliderProps = {
  $gridArea: string;
} & ControlledProps;

const InteractivePanelControlStyle = css<ControlledProps>`
  cursor: pointer;
  background-color: ${({ theme }) => theme.panelControlGray};
  border-radius: 0.25rem;
  min-width: 40px;
  min-height: 40px;
  width: fit-content;
  height: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.pureBlack};
  width: ${({ $controlled }) => ($controlled ? 'auto' : '100%')};

  ${({ $controlled, theme }) =>
    !$controlled &&
    `
    @media ${theme.isLargerThanPhone} {
        width: auto;
    }
    `}
`;

export const PanelControlWrapper = styled.li`
  display: contents;
`;

export const ContentSpan = styled.span`
  display: contents;
`;

export const PanelControlSlider = styled.div<PanelControlSliderProps>`
  ${InteractivePanelControlStyle}
  grid-area: ${({ $gridArea }) => $gridArea};
  max-height: 40px;
`;

export const MutedMarkSlider = styled(Slider)`
  flex-grow: 1;

  > .MuiSlider-markActive {
    opacity: 1;
    background-color: currentColor;
  }
`;

export const PanelControlButton = styled(ButtonBase).attrs(({ className }) => ({
  className
}))<ControlledProps>`
  ${InteractivePanelControlStyle}

  border: none;
  flex-grow: 1;
  margin: 0;
  padding: 0;

  &:focus {
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
  }

  &:active {
    color: ${({ theme }) => theme.gbaThemeBlue};
  }

  @media ${({ theme }) => theme.isMobileLandscape} {
    flex-shrink: 1;
    min-width: unset;
  }
`;
