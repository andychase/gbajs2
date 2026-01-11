import { useMediaQuery } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback, useId, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  AiOutlineBackward,
  AiOutlineFastForward,
  AiOutlineForward
} from 'react-icons/ai';
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

import {
  emulatorFFMultiplierLocalStorageKey,
  emulatorSettingsLocalStorageKey,
  emulatorVolumeLocalStorageKey
} from '../../context/emulator/consts.ts';
import {
  useDragContext,
  useEmulatorContext,
  useInitialBoundsContext,
  useLayoutContext,
  useResizeContext,
  useRunningContext
} from '../../hooks/context.tsx';
import { useBackgroundEmulator } from '../../hooks/emulator/use-background-emulator.tsx';
import { useQuitGame } from '../../hooks/emulator/use-quit-game.tsx';
import { GripperHandle } from '../shared/gripper-handle.tsx';
import { PanelButton, SliderButton } from './control-panel/buttons.tsx';
import { PanelSlider } from './control-panel/panel-slider.tsx';
import { useUnloadEmulator } from '../../hooks/emulator/use-unload-emulator.tsx';

import type { EmulatorSettings } from '../modals/emulator-settings.tsx';

type PanelProps = {
  $controlled: boolean;
  $isLargerThanPhone: boolean;
  $areItemsDraggable: boolean;
};

type emulatorVolumeBeforeAutoMuteSources = 'rewind' | 'fastForwardSlowdown';

const Panel = styled('ul', {
  shouldForwardProp: (propName) => !propName.toString().startsWith('$')
})<PanelProps>`
  background-color: ${({ theme }) => theme.panelBlueGray};
  list-style: none;
  padding: 10px;
  margin: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: 1fr 1fr;
  gap: 10px 10px;
  grid-template-areas:
    'play play quit quit drag drag resize resize rewind rewind'
    'volume volume volume volume volume fastForward fastForward fastForward fastForward fastForward';

  ${({ $controlled, $isLargerThanPhone }) =>
    ($controlled || $isLargerThanPhone) &&
    `
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-evenly;
    gap: 10px;
  `}

  ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable &&
    `
    outline-color: ${theme.gbaThemeBlue};
    outline-style: dashed;
    outline-width: 2px;
    outline-offset: -2px;
  `}
`;

const FAST_FORWARD_SLOWDOWN_VALUES = [
  { value: -5, label: '1/5x' },
  { value: -4, label: '1/4x' },
  { value: -3, label: '1/3x' },
  { value: -2, label: '1/2x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
  { value: 5, label: '5x' }
] as const;

const FAST_FORWARD_SLOWDOWN_BY_VALUE = new Map<number, number>(
  FAST_FORWARD_SLOWDOWN_VALUES.map((r, i) => [r.value, i])
);

export const ControlPanel = () => {
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const { areItemsDraggable, setAreItemsDraggable } = useDragContext();
  const { areItemsResizable, setAreItemsResizable } = useResizeContext();
  const { setLayout, getLayout } = useLayoutContext();
  const { initialBounds, setInitialBound } = useInitialBoundsContext();
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const isMobileLandscape = useMediaQuery(theme.isMobileLandscape);
  const [isPaused, setIsPaused] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const controlPanelId = useId();
  const quitGame = useQuitGame();
  const [fastForwardMultiplier, setFastForwardMultiplier] = useLocalStorage(
    emulatorFFMultiplierLocalStorageKey,
    1
  );
  const [currentEmulatorVolume, setCurrentEmulatorVolume] = useLocalStorage(
    emulatorVolumeLocalStorageKey,
    1
  );
  const [emulatorSettings] = useLocalStorage<EmulatorSettings | undefined>(
    emulatorSettingsLocalStorageKey
  );
  const [emulatorVolumeBeforeAutoMute, setEmulatorVolumeBeforeAutoMute] =
    useLocalStorage<
      | {
          volumeBeforeMute: number;
          type: emulatorVolumeBeforeAutoMuteSources;
        }
      | undefined
    >('emulatorVolumeBeforeAutoMuteLocalStorageKey');
  const rndRef = useRef<Rnd | null>(null);

  const muteAndPreserveVolume = (type: emulatorVolumeBeforeAutoMuteSources) => {
    if (currentEmulatorVolume > 0) {
      setEmulatorVolumeBeforeAutoMute({
        volumeBeforeMute: currentEmulatorVolume,
        type
      });
      emulator?.setVolume(0);
      setCurrentEmulatorVolume(0);
    }
  };

  const restoreVolume = (type: emulatorVolumeBeforeAutoMuteSources) => {
    if (type !== emulatorVolumeBeforeAutoMute?.type) return;

    emulator?.setVolume(emulatorVolumeBeforeAutoMute.volumeBeforeMute);
    setCurrentEmulatorVolume(emulatorVolumeBeforeAutoMute.volumeBeforeMute);

    setEmulatorVolumeBeforeAutoMute(undefined);
  };

  // pause emulator when document is not visible,
  // resumes if applicable when document is visible
  useBackgroundEmulator({ isPaused });

  // take auto save state when page is hidden (best effort)
  useUnloadEmulator();

  const refSetLayout = useCallback(
    (node: Rnd | null) => {
      if (!initialBounds?.controlPanel && node)
        setInitialBound(
          'controlPanel',
          node.resizableElement.current?.getBoundingClientRect()
        );

      rndRef.current = node;
    },
    [initialBounds?.controlPanel, setInitialBound]
  );

  const screenLayout = getLayout('screen');
  const controlPanelLayout = getLayout('controlPanel');

  const canvasBounds = screenLayout?.originalBounds ?? initialBounds?.screen;

  if (!canvasBounds) return null;

  const dragWrapperPadding = isLargerThanPhone ? 5 : 0;
  const isControlled = !!controlPanelLayout?.size || isResizing;

  const togglePlay = async () => {
    if (!isRunning) return;

    if (isPaused) await emulator?.resume();
    else emulator?.pause();

    setIsPaused((prevState) => !prevState);
  };

  const setVolume = (volumePercent: number) => {
    emulator?.setVolume(volumePercent);
    setCurrentEmulatorVolume(volumePercent);
    setEmulatorVolumeBeforeAutoMute(undefined);
  };

  const setFastForward = (ffMultiplier: number) => {
    emulator?.setFastForwardMultiplier(ffMultiplier);
    setFastForwardMultiplier(ffMultiplier);

    const shouldMuteNext =
      (emulatorSettings?.muteOnFastForward && ffMultiplier > 1) ||
      (emulatorSettings?.muteOnSlowdown && ffMultiplier < 1);

    if (shouldMuteNext) {
      if (!emulatorVolumeBeforeAutoMute)
        muteAndPreserveVolume('fastForwardSlowdown');

      return;
    }

    restoreVolume('fastForwardSlowdown');
  };

  const defaultPosition = isMobileLandscape
    ? { x: Math.floor(canvasBounds.left + canvasBounds.width), y: 0 }
    : {
        x: Math.floor(canvasBounds.left),
        y: Math.floor(canvasBounds.bottom + dragWrapperPadding)
      };
  const defaultSize = isMobileLandscape
    ? {
        width: Math.min(80, canvasBounds.left),
        height: 'auto'
      }
    : {
        width: isLargerThanPhone ? 'auto' : '100dvw',
        height: 'auto'
      };

  const position = controlPanelLayout?.position ?? defaultPosition;
  const size = controlPanelLayout?.size ?? defaultSize;

  const defaultSliderEvents = {
    onFocus: emulator?.disableKeyboardInput,
    onBlur: emulator?.enableKeyboardInput,
    // click is triggered on keyup, if using mouse this
    // is the desired behavior after focus is gained
    onClick: emulator?.enableKeyboardInput
  };

  return (
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
      onDragStart={() => {
        if (!controlPanelLayout?.originalBounds)
          setLayout('controlPanel', {
            originalBounds:
              rndRef.current?.resizableElement.current?.getBoundingClientRect()
          });
      }}
      onDragStop={(_, data) => {
        setLayout('controlPanel', { position: { x: data.x, y: data.y } });
      }}
      onResizeStart={() => {
        setIsResizing(true);
        if (!controlPanelLayout?.originalBounds)
          setLayout('controlPanel', {
            originalBounds:
              rndRef.current?.resizableElement.current?.getBoundingClientRect()
          });
      }}
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
        $areItemsDraggable={areItemsDraggable}
      >
        <IconContext.Provider value={{ size: '2em' }}>
          <PanelButton
            id={`${controlPanelId}--play`}
            ariaLabel={isPaused || !isRunning ? 'Play' : 'Pause'}
            onClick={togglePlay}
            controlled={isControlled}
            $gridArea="play"
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
            $gridArea="quit"
          >
            <BiUndo />
          </PanelButton>
          <PanelButton
            id={`${controlPanelId}--drag`}
            className="noDrag"
            ariaLabel={areItemsDraggable ? 'Anchor Items' : 'Drag Items'}
            onClick={() => {
              setAreItemsDraggable((prevState) => !prevState);
            }}
            controlled={isControlled}
            $gridArea="drag"
          >
            {areItemsDraggable ? (
              <BiMove color={theme.gbaThemeBlue} />
            ) : (
              <BiMove />
            )}
          </PanelButton>
          <PanelButton
            id={`${controlPanelId}--resize`}
            className="noDrag"
            ariaLabel={
              areItemsResizable ? 'Stop Resizing Items' : 'Resize Items'
            }
            onClick={() => {
              setAreItemsResizable((prevState) => !prevState);
            }}
            controlled={isControlled}
            $gridArea="resize"
          >
            {areItemsResizable ? (
              <TbResize color={theme.gbaThemeBlue} />
            ) : (
              <TbResize />
            )}
          </PanelButton>
          <PanelButton
            id={`${controlPanelId}--rewind`}
            ariaLabel={'Rewind Emulator'}
            controlled={isControlled}
            $gridArea="rewind"
            onPointerDown={() => {
              if (areItemsDraggable) return;

              emulator?.toggleRewind(true);
              if (
                emulatorSettings?.muteOnRewind &&
                !emulatorVolumeBeforeAutoMute
              )
                muteAndPreserveVolume('rewind');
            }}
            onPointerUp={() => {
              if (areItemsDraggable) return;

              emulator?.toggleRewind(false);
              if (emulatorSettings?.muteOnRewind) restoreVolume('rewind');
            }}
          >
            <AiOutlineBackward style={{ maxHeight: '100%' }} />
          </PanelButton>
          <PanelSlider
            id={`${controlPanelId}--volume-slider`}
            aria-label="Volume Slider"
            gridArea="volume"
            controlled={isControlled}
            disablePointerEvents={areItemsDraggable}
            value={currentEmulatorVolume}
            step={0.1}
            min={0}
            max={1}
            minIcon={
              <SliderButton
                aria-label="Mute Volume"
                icon={<BiVolumeMute style={{ maxHeight: '100%' }} />}
                onClick={() => setVolume(0)}
              />
            }
            maxIcon={
              <SliderButton
                aria-label="Max Volume"
                icon={<BiVolumeFull style={{ maxHeight: '100%' }} />}
                onClick={() => setVolume(1)}
              />
            }
            valueLabelFormat={`${currentEmulatorVolume * 100}`}
            onChange={(_, value) => {
              const volumePercent = Number(value);
              setVolume(volumePercent);
            }}
            ButtonIcon={BiVolumeFull}
            {...defaultSliderEvents}
          />
          <PanelSlider
            id={`${controlPanelId}--fast-forward`}
            aria-label="Fast Forward/Slowdown Slider"
            gridArea="fastForward"
            controlled={isControlled}
            disablePointerEvents={areItemsDraggable}
            value={
              FAST_FORWARD_SLOWDOWN_BY_VALUE.get(fastForwardMultiplier) ??
              FAST_FORWARD_SLOWDOWN_BY_VALUE.get(4)
            }
            min={emulatorSettings?.slowdownEnabled ? 0 : 4}
            max={emulatorSettings?.slowdownEnabled ? 8 : 8}
            minIcon={
              <SliderButton
                aria-label="Regular Speed"
                icon={<AiOutlineForward style={{ maxHeight: '100%' }} />}
                onClick={() => setFastForward(1)}
              />
            }
            maxIcon={
              <SliderButton
                aria-label="Max Fast Forward"
                icon={<AiOutlineFastForward style={{ maxHeight: '100%' }} />}
                onClick={() => setFastForward(5)}
              />
            }
            valueLabelFormat={(value) =>
              (
                FAST_FORWARD_SLOWDOWN_VALUES[value] ??
                FAST_FORWARD_SLOWDOWN_VALUES[4]
              ).label
            }
            onChange={(_, value) => {
              const ffMultiplier = (
                FAST_FORWARD_SLOWDOWN_VALUES[Number(value)] ??
                FAST_FORWARD_SLOWDOWN_VALUES[4]
              ).value;
              setFastForward(ffMultiplier);
            }}
            ButtonIcon={AiOutlineFastForward}
            {...defaultSliderEvents}
          />
        </IconContext.Provider>
      </Panel>
    </Rnd>
  );
};
