import { IconButton, Slider, useMediaQuery } from '@mui/material';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useId, useState, type ReactNode } from 'react';
import { IconContext } from 'react-icons';
import { AiOutlineFastForward, AiOutlineForward } from 'react-icons/ai';
import {
  BiPlay,
  BiUndo,
  BiVolumeFull,
  BiMove,
  BiVolumeMute,
  BiPause
} from 'react-icons/bi';
import { TbResize } from 'react-icons/tb';
import { Rnd } from 'react-rnd';
import { css, styled, useTheme } from 'styled-components';

import {
  emulatorVolumeLocalStorageKey,
  emulatorFFMultiplierLocalStorageKey
} from '../../context/emulator/consts.ts';
import {
  useDragContext,
  useEmulatorContext,
  useLayoutContext,
  useResizeContext,
  useRunningContext
} from '../../hooks/context.tsx';
import { useBackgroundEmulator } from '../../hooks/emulator/use-background-emulator.tsx';
import { useQuitGame } from '../../hooks/emulator/use-quit-game.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ButtonBase } from '../shared/custom-button-base.tsx';
import { GripperHandle } from '../shared/gripper-handle.tsx';

import type { IconButtonProps, SliderProps } from '@mui/material';

type PanelProps = {
  $controlled: boolean;
  $isLargerThanPhone: boolean;
};

type SliderIconButtonProps = {
  icon: ReactNode;
} & IconButtonProps;

type PanelControlProps = {
  ariaLabel: string;
  children: ReactNode;
  controlled: boolean;
  id: string;
  onClick?: () => void;
};

type PanelSliderProps = {
  controlled: boolean;
  gridArea: string;
  maxIcon: ReactNode;
  minIcon: ReactNode;
} & SliderProps;

type ControlledProps = {
  $controlled: boolean;
};

type PanelControlSliderProps = {
  $gridArea: string;
} & ControlledProps;

const Panel = styled.ul<PanelProps>`
  background-color: ${({ theme }) => theme.panelBlueGray};
  list-style: none;
  padding: 10px;
  margin: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px 10px;
  grid-template-areas:
    '. . . .'
    'volume volume fastForward fastForward';

  ${({ $controlled, $isLargerThanPhone }) =>
    ($controlled || $isLargerThanPhone) &&
    `
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-evenly;
    gap: 10px;
  `}
`;

const PanelControlWrapper = styled.li`
  display: contents;
`;

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

const PanelControlButton = styled(ButtonBase).attrs({
  className: 'noDrag'
})<ControlledProps>`
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
`;

const PanelControlSlider = styled.li<PanelControlSliderProps>`
  ${InteractivePanelControlStyle}
  grid-area: ${({ $gridArea }) => $gridArea};
  max-height: 40px;
`;

const MutedMarkSlider = styled(Slider)`
  flex-grow: 1;

  > .MuiSlider-markActive {
    opacity: 1;
    background-color: currentColor;
  }
`;

const PanelButton = ({
  ariaLabel,
  children,
  controlled,
  id,
  onClick
}: PanelControlProps) => {
  return (
    <PanelControlWrapper>
      <PanelControlButton
        aria-label={ariaLabel}
        id={id}
        onClick={onClick}
        $controlled={controlled}
      >
        {children}
      </PanelControlButton>
    </PanelControlWrapper>
  );
};

const SliderIconButton = ({ icon, ...rest }: SliderIconButtonProps) => {
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

const PanelSlider = ({
  controlled,
  gridArea,
  id,
  maxIcon,
  minIcon,
  ...rest
}: PanelSliderProps) => {
  return (
    <PanelControlSlider id={id} $gridArea={gridArea} $controlled={controlled}>
      {minIcon}
      <MutedMarkSlider
        marks
        sx={{
          width: '85px',
          margin: '0 10px',
          maxHeight: '40px'
        }}
        valueLabelDisplay="auto"
        {...rest}
      />
      {maxIcon}
    </PanelControlSlider>
  );
};

export const ControlPanel = () => {
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { areItemsDraggable, setAreItemsDraggable } = useDragContext();
  const { areItemsResizable, setAreItemsResizable } = useResizeContext();
  const { layouts, setLayout } = useLayoutContext();
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const [isPaused, setIsPaused] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const controlPanelId = useId();
  const quitGame = useQuitGame();
  const [currentEmulatorVolume, setCurrentEmulatorVolume] = useLocalStorage(
    emulatorVolumeLocalStorageKey,
    1
  );
  const [fastForwardMultiplier, setFastForwardMultiplier] = useLocalStorage(
    emulatorFFMultiplierLocalStorageKey,
    1
  );

  // pause emulator when document is not visible,
  // resumes if applicable when document is visible
  useBackgroundEmulator({ isPaused });

  const refSetLayout = useCallback(
    (node: Rnd | null) => {
      if (!layouts?.controlPanel?.initialBounds && node)
        setLayout('controlPanel', {
          initialBounds: node.resizableElement.current?.getBoundingClientRect()
        });
    },
    [setLayout, layouts]
  );

  const canvasBounds = layouts?.screen?.initialBounds;

  if (!canvasBounds) return null;

  const dragWrapperPadding = isLargerThanPhone ? 5 : 0;
  const isControlled = !!layouts?.controlPanel?.size || isResizing;

  const togglePlay = () => {
    if (!isRunning) return;

    if (isPaused) emulator?.resume();
    else emulator?.pause();

    setIsPaused((prevState) => !prevState);
  };

  const setVolume = (volumePercent: number) => {
    emulator?.setVolume(volumePercent);
    setCurrentEmulatorVolume(volumePercent);
  };

  const setVolumeFromEvent = (event: Event) => {
    const volumePercent = Number((event.target as HTMLInputElement)?.value);
    setVolume(volumePercent);
  };

  const setFastForward = (ffMultiplier: number) => {
    emulator?.setFastForwardMultiplier(ffMultiplier);
    setFastForwardMultiplier(ffMultiplier);
  };

  const setFastForwardFromEvent = (event: Event) => {
    const ffMultiplier = Number((event.target as HTMLInputElement)?.value);
    emulator?.setFastForwardMultiplier(ffMultiplier);
    setFastForwardMultiplier(ffMultiplier);
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <>
          <p>
            Use the control panel to quickly perform in game actions and
            reposition controls.
          </p>
          <p>Click next to take a tour of the controls!</p>
        </>
      ),
      placementBeacon: 'bottom',
      target: `#${CSS.escape(controlPanelId)}`
    },
    {
      content: (
        <p>
          Use the this button to pause and resume your game if it is running.
        </p>
      ),
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--play`)}`
    },
    {
      content: <p>Use this button to quit your current game.</p>,
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--quit-game`)}`
    },
    {
      content: (
        <p>
          Use this button to enable dragging and repositioning of the screen,
          controls, and control panel.
        </p>
      ),
      placement: isLargerThanPhone ? 'auto' : 'right',
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--drag`)}`
    },
    {
      content: <p>Use this button to resize the screen and control panel.</p>,
      placement: isLargerThanPhone ? 'auto' : 'right',
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--resize`)}`
    },
    {
      content: (
        <>
          <p>Use this slider to increase and decrease the emulator volume.</p>
          <p>Your volume setting will be saved between refreshes!</p>
        </>
      ),
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--volume-slider`)}`
    },
    {
      content: (
        <>
          <p>
            Use this slider to increase and decrease the fast forward speed.
          </p>
          <p>Your fast forward setting will be saved between refreshes!</p>
        </>
      ),
      placement: isLargerThanPhone ? 'auto' : 'right',
      placementBeacon: 'bottom',
      target: `#${CSS.escape(`${controlPanelId}--fast-forward`)}`
    }
  ];

  const defaultPosition = {
    x: Math.floor(canvasBounds.left),
    y: Math.floor(canvasBounds.bottom + dragWrapperPadding)
  };
  const defaultSize = {
    width: isLargerThanPhone ? 'auto' : '100dvw',
    height: 'auto'
  };

  const position = layouts?.controlPanel?.position ?? defaultPosition;
  const size = layouts?.controlPanel?.size ?? defaultSize;

  const defaultSliderEvents = {
    onFocus: emulator?.disableKeyboardInput,
    onBlur: emulator?.enableKeyboardInput,
    // click is triggered on keyup, if using mouse this
    // is the desired behavior after focus is gained
    onClick: emulator?.enableKeyboardInput
  };

  return (
    <>
      <Rnd
        data-testid="control-panel-wrapper"
        id={controlPanelId}
        disableDragging={!areItemsDraggable}
        enableResizing={areItemsResizable}
        resizeHandleComponent={{
          bottomRight: <GripperHandle variation="bottomRight" />,
          bottomLeft: <GripperHandle variation="bottomLeft" />
        }}
        resizeHandleStyles={{
          bottomRight: { marginBottom: '15px', marginRight: '15px' },
          bottomLeft: { marginBottom: '15px', marginLeft: '15px' }
        }}
        ref={refSetLayout}
        cancel=".noDrag"
        position={position}
        size={size}
        onDragStop={(_, data) => {
          setLayout('controlPanel', { position: { x: data.x, y: data.y } });
        }}
        onResizeStart={() => setIsResizing(true)}
        onResizeStop={(_1, _2, ref, _3, position) => {
          setLayout('controlPanel', {
            size: { width: ref.clientWidth, height: ref.clientHeight },
            position: { ...position }
          });
          setIsResizing(false);
        }}
        default={{
          ...defaultPosition,
          ...defaultSize
        }}
      >
        <Panel
          $controlled={isControlled}
          $isLargerThanPhone={isLargerThanPhone}
        >
          <IconContext.Provider value={{ size: '2em' }}>
            <PanelButton
              id={`${controlPanelId}--play`}
              ariaLabel={isPaused || !isRunning ? 'Play' : 'Pause'}
              onClick={togglePlay}
              controlled={isControlled}
            >
              {isPaused || !isRunning ? <BiPlay /> : <BiPause />}
            </PanelButton>
            <PanelButton
              id={`${controlPanelId}--quit-game`}
              ariaLabel="Quit Game"
              onClick={() => {
                quitGame();
                setIsPaused(false);
              }}
              controlled={isControlled}
            >
              <BiUndo />
            </PanelButton>
            <PanelButton
              id={`${controlPanelId}--drag`}
              ariaLabel={areItemsDraggable ? 'Anchor Items' : 'Drag Items'}
              onClick={() => {
                setAreItemsDraggable((prevState) => !prevState);
              }}
              controlled={isControlled}
            >
              {areItemsDraggable ? (
                <BiMove color={theme.gbaThemeBlue} />
              ) : (
                <BiMove />
              )}
            </PanelButton>
            <PanelButton
              id={`${controlPanelId}--resize`}
              ariaLabel={
                areItemsResizable ? 'Stop Resizing Items' : 'Resize Items'
              }
              onClick={() => {
                setAreItemsResizable((prevState) => !prevState);
              }}
              controlled={isControlled}
            >
              {areItemsResizable ? (
                <TbResize color={theme.gbaThemeBlue} />
              ) : (
                <TbResize />
              )}
            </PanelButton>
            <PanelSlider
              id={`${controlPanelId}--volume-slider`}
              aria-label="Volume Slider"
              gridArea="volume"
              controlled={isControlled}
              value={currentEmulatorVolume}
              step={0.1}
              min={0}
              max={1}
              minIcon={
                <SliderIconButton
                  aria-label="Mute Volume"
                  icon={<BiVolumeMute style={{ maxHeight: '100%' }} />}
                  onClick={() => setVolume(0)}
                />
              }
              maxIcon={
                <SliderIconButton
                  aria-label="Max Volume"
                  icon={<BiVolumeFull style={{ maxHeight: '100%' }} />}
                  onClick={() => setVolume(1)}
                />
              }
              valueLabelFormat={`${currentEmulatorVolume * 100}`}
              onChange={setVolumeFromEvent}
              {...defaultSliderEvents}
            />
            <PanelSlider
              id={`${controlPanelId}--fast-forward`}
              aria-label="Fast Forward Slider"
              gridArea="fastForward"
              controlled={isControlled}
              value={fastForwardMultiplier}
              step={1}
              min={1}
              max={5}
              minIcon={
                <SliderIconButton
                  aria-label="Regular Speed"
                  icon={<AiOutlineForward style={{ maxHeight: '100%' }} />}
                  onClick={() => setFastForward(1)}
                />
              }
              maxIcon={
                <SliderIconButton
                  aria-label="Max Fast Forward"
                  icon={<AiOutlineFastForward style={{ maxHeight: '100%' }} />}
                  onClick={() => setFastForward(5)}
                />
              }
              valueLabelFormat={`x${fastForwardMultiplier}`}
              onChange={setFastForwardFromEvent}
              {...defaultSliderEvents}
            />
          </IconContext.Provider>
        </Panel>
      </Rnd>
      <EmbeddedProductTour
        steps={tourSteps}
        completedProductTourStepName="hasCompletedControlPanelTour"
        zIndex={isLargerThanPhone ? 160 : 0}
        renderWithoutDelay
        isNotInModal
      />
    </>
  );
};
