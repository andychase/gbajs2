import {
  useState,
  useRef,
  useContext,
  useCallback,
  type PointerEvent
} from 'react';
import Draggable from 'react-draggable';
import { styled } from 'styled-components';

import { EmulatorContext } from '../../context/emulator/emulator.tsx';
import { LayoutContext } from '../../context/layout/layout.tsx';

import type { Position } from 'react-rnd';

type InitialPosition = {
  top: string;
  left: string;
};

type OPadProps = {
  initialPosition?: InitialPosition;
  disableDragging?: boolean;
};

type CenterKnobProps = {
  $isControlled: boolean;
};

type BackgroundContainerProps = {
  $initialPosition?: InitialPosition;
  $areItemsDraggable?: boolean;
};

type KeyState = {
  UP?: number;
  DOWN?: number;
  LEFT?: number;
  RIGHT?: number;
};

const BackgroundContainer = styled.div<BackgroundContainerProps>`
  position: absolute;
  background-color: red;
  border-radius: 50%;
  width: 12rem;
  height: 12rem;
  background: ${({ theme }) => theme.pureBlack};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-color: ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable ? theme.gbaThemeBlue : 'rgba(255, 255, 255, 0.9)'};
  border-style: ${({ $areItemsDraggable = false }) =>
    $areItemsDraggable ? 'dashed' : 'solid'};
  border-width: 2px;
  z-index: 12;

  ${({ $initialPosition = { top: '0', left: '0' } }) =>
    `
    top: ${$initialPosition.top};
    left: ${$initialPosition.left};
    `};
`;

const CenterKnob = styled.div<CenterKnobProps>`
  position: absolute;
  height: 4rem;
  width: 4rem;
  border: 2px solid ${({ theme }) => theme.gbaThemeBlue};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.pureBlack};
  transition: ${({ $isControlled = false }) =>
    $isControlled ? `transform 0.3s ease-in-out` : `none`};

  &:before {
    position: absolute;
    content: '';
    top: -0.8rem;
    left: -0.8rem;
    right: -0.8rem;
    bottom: -0.8rem;
    border: 0.8rem solid ${({ theme }) => theme.gbaThemeBlue}50;
    border-radius: 50%;
  }
`;

const DirectionArrow = styled.div`
  width: 0;
  height: 0;
  border-style: solid;
  position: absolute;
`;

const UpArrow = styled(DirectionArrow)`
  border-width: 0 15px 25px 15px;
  border-color: transparent transparent ${({ theme }) => theme.pureWhite}
    transparent;
  top: 10px;
`;

const DownArrow = styled(DirectionArrow)`
  border-width: 25px 15px 0 15px;
  border-color: ${({ theme }) => theme.pureWhite} transparent transparent
    transparent;
  bottom: 10px;
`;

const LeftArrow = styled(DirectionArrow)`
  border-width: 15px 25px 15px 0;
  border-color: transparent ${({ theme }) => theme.pureWhite} transparent
    transparent;
  left: 10px;
`;

const RightArrow = styled(DirectionArrow)`
  border-width: 15px 0 15px 25px;
  border-color: transparent transparent transparent
    ${({ theme }) => theme.pureWhite};
  right: 10px;
`;

export const OPad = ({ initialPosition }: OPadProps) => {
  const { emulator, areItemsDraggable } = useContext(EmulatorContext);
  const { layouts, setLayout } = useContext(LayoutContext);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isControlled, setIsControlled] = useState(true);
  const containerDragRef = useRef<HTMLDivElement>(null);
  const knobDragRef = useRef<HTMLDivElement>(null);
  const [isKeyDown, setIsKeyDown] = useState<KeyState>({});

  const pressEmulatorArrow = useCallback(
    (keyId: string, pointerId: number) => {
      setIsKeyDown((prevState) => ({ ...prevState, [keyId]: pointerId }));
      emulator?.simulateKeyDown(keyId);
    },
    [emulator]
  );

  const unpressEmulatorArrow = useCallback(
    (pointerId: number) => {
      const keyIds = Object.keys(isKeyDown).filter((key: string) => {
        return isKeyDown[key as keyof typeof isKeyDown] === pointerId;
      });

      keyIds.forEach((keyId) => {
        setIsKeyDown((prevState) => ({ ...prevState, [keyId]: undefined }));
        emulator?.simulateKeyUp(keyId);
      });
    },
    [isKeyDown, emulator]
  );

  const getKeyId = ({ x, y }: Position) => {
    // Rotate the x and y axis 45 degress,
    // these are now the gridlines for our quadrants.
    // Convert to the rotated coordinate system
    const xAxisRotated = x * Math.cos(Math.PI / 4) - y * Math.sin(Math.PI / 4);
    const yAxisRotated = x * Math.sin(Math.PI / 4) + y * Math.cos(Math.PI / 4);

    // evaluate which arrow button was pressed, return keyId
    if (xAxisRotated >= 0 && yAxisRotated >= 0) {
      return 'RIGHT';
    } else if (xAxisRotated < 0 && yAxisRotated >= 0) {
      return 'DOWN';
    } else if (xAxisRotated < 0 && yAxisRotated < 0) {
      return 'LEFT';
    } else if (xAxisRotated >= 0 && yAxisRotated < 0) {
      return 'UP';
    } else {
      return null;
    }
  };

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!containerDragRef.current || !knobDragRef.current) return;
      // get bounding rects
      const parentRect = containerDragRef.current.getBoundingClientRect();
      const childRect = knobDragRef.current.getBoundingClientRect();
      // convert from page coordinates to element coordinates,
      // additionally, restrict to parent bounds
      const x = Math.max(
        -parentRect.width / 2 + childRect.width / 2,
        Math.min(
          event.clientX - parentRect.left - parentRect.width / 2,
          parentRect.width / 2 - childRect.width / 2
        )
      );
      const y = Math.max(
        -parentRect.height / 2 + childRect.height / 2,
        Math.min(
          event.clientY - parentRect.top - parentRect.height / 2,
          parentRect.height / 2 - childRect.height / 2
        )
      );

      if (!areItemsDraggable) {
        setPosition({ x, y });
      }

      const keyId = getKeyId({ x, y });

      if (keyId && !isKeyDown[keyId as keyof typeof isKeyDown]) {
        unpressEmulatorArrow(event.pointerId);
        pressEmulatorArrow(keyId, event.pointerId);
      }
    },
    [areItemsDraggable, isKeyDown, pressEmulatorArrow, unpressEmulatorArrow]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      setIsControlled(false);
      if (!containerDragRef.current) return;

      // Get the parent's position on the screen
      const parentRect = containerDragRef.current.getBoundingClientRect();
      // Calculate the relative position of the pointer event within the parent element
      const x = event.clientX - parentRect.left - parentRect.width / 2;
      const y = event.clientY - parentRect.top - parentRect.width / 2;

      if (!areItemsDraggable) {
        setPosition({ x, y });
      }

      const keyId = getKeyId({ x, y });

      if (keyId) pressEmulatorArrow(keyId, event.pointerId);
    },
    [areItemsDraggable, pressEmulatorArrow]
  );

  const resetPosition = (event: PointerEvent<HTMLDivElement>) => {
    setIsControlled(true);
    setPosition({ x: 0, y: 0 });
    unpressEmulatorArrow(event.pointerId);
  };

  const dragPosition = layouts?.oPad?.position ?? { x: 0, y: 0 };

  return (
    <Draggable
      nodeRef={containerDragRef}
      disabled={!areItemsDraggable}
      position={dragPosition}
      onStop={(_, data) =>
        setLayout('oPad', { position: { x: data.x, y: data.y } })
      }
    >
      <BackgroundContainer
        ref={containerDragRef}
        $initialPosition={initialPosition}
        $areItemsDraggable={areItemsDraggable}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={resetPosition}
        onPointerCancel={resetPosition}
        onPointerOut={resetPosition}
        onPointerLeave={resetPosition}
      >
        <Draggable disabled nodeRef={knobDragRef} position={position}>
          <CenterKnob ref={knobDragRef} $isControlled={isControlled} />
        </Draggable>
        <LeftArrow />
        <RightArrow />
        <UpArrow />
        <DownArrow />
      </BackgroundContainer>
    </Draggable>
  );
};
