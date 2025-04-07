import { useRef, type ReactNode, type KeyboardEvent } from 'react';
import Draggable from 'react-draggable';
import { styled } from 'styled-components';

import {
  useDragContext,
  useEmulatorContext,
  useLayoutContext
} from '../../hooks/context.tsx';
import { ButtonBase } from '../shared/custom-button-base.tsx';

type VirtualButtonProps = {
  isRectangular?: boolean;
  width?: number;
  children: ReactNode;
  inputName: string;
  keyId?: string;
  initialPosition?: {
    top: string;
    left: string;
  };
  initialOffset?: {
    x: string | number;
    y: string | number;
  };
  onClick?: () => void;
  enabled?: boolean;
  ariaLabel: string;
};

type CircularButtonProps = {
  $diameter: number;
  $initialPosition?: { top: string; left: string };
  $areItemsDraggable?: boolean;
};

type RectangularButtonProps = {
  $initialPosition?: { top: string; left: string };
  $areItemsDraggable?: boolean;
};

const VirtualButtonBase = styled(ButtonBase)`
  background-color: ${({ theme }) => theme.darkGray};
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  cursor: pointer;
  box-sizing: content-box;
  border-width: 2px;

  @media ${({ theme }) => theme.isMobileLandscape} {
    background-color: transparent;
  }
`;

const CircularButton = styled(VirtualButtonBase).attrs<CircularButtonProps>(
  (props) => ({
    style: {
      top: props.$initialPosition?.top || '0',
      left: props.$initialPosition?.left || '0'
    }
  })
)<CircularButtonProps>`
  width: ${({ $diameter = 60 }) => $diameter}px;
  height: ${({ $diameter = 60 }) => $diameter}px;
  border-radius: 100px;
  border-color: ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable ? theme.gbaThemeBlue : 'rgba(255, 255, 255, 0.9)'};
  border-style: ${({ $areItemsDraggable = false }) =>
    $areItemsDraggable ? 'dashed' : 'solid'};
`;

const RectangularButton = styled(
  VirtualButtonBase
).attrs<RectangularButtonProps>((props) => ({
  style: {
    top: props.$initialPosition?.top ?? '0',
    left: props.$initialPosition?.left ?? '0'
  }
}))`
  border-radius: 16px;
  width: fit-content;
  min-width: 85px;
  border-color: ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable ? theme.gbaThemeBlue : 'rgba(255, 255, 255, 0.9)'};
  border-style: ${({ $areItemsDraggable = false }) =>
    $areItemsDraggable ? 'dashed' : 'solid'};
`;

export const VirtualButton = ({
  isRectangular = false,
  width = 60,
  children,
  keyId,
  inputName,
  onClick,
  initialPosition,
  initialOffset,
  enabled = false,
  ariaLabel
}: VirtualButtonProps) => {
  const { emulator } = useEmulatorContext();
  const { areItemsDraggable } = useDragContext();
  const { getLayout, setLayout } = useLayoutContext();
  const dragRef = useRef<HTMLButtonElement | null>(null);

  if (!enabled) return null;

  const pointerEvents =
    keyId && !areItemsDraggable
      ? {
          onPointerDown: () => {
            emulator?.simulateKeyDown(keyId);
          },
          onPointerUp: () => {
            emulator?.simulateKeyUp(keyId);
          },
          onPointerLeave: () => {
            emulator?.simulateKeyUp(keyId);
          },
          onPointerOut: () => {
            emulator?.simulateKeyUp(keyId);
          },
          onPointerCancel: () => {
            emulator?.simulateKeyUp(keyId);
          }
        }
      : undefined;
  // due to using pointer events for the buttons without a click handler,
  // we need to manage key events ourselves for buttons with an emulator keyId
  const keyboardEvents = keyId
    ? {
        onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.code == 'Space' || e.key == ' ')
            emulator?.simulateKeyDown(keyId);
        },
        onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.code == 'Space' || e.key == ' ') emulator?.simulateKeyUp(keyId);
        }
      }
    : undefined;

  const layout = getLayout(inputName);
  const position = layout?.position ?? { x: 0, y: 0 };

  return (
    <Draggable
      nodeRef={dragRef}
      positionOffset={initialOffset}
      position={position}
      disabled={!areItemsDraggable}
      onStop={(_, data) =>
        setLayout(inputName, { position: { x: data.x, y: data.y } })
      }
    >
      {isRectangular ? (
        <RectangularButton
          ref={dragRef}
          $initialPosition={initialPosition}
          $areItemsDraggable={areItemsDraggable}
          aria-label={ariaLabel}
          onClick={onClick}
          {...pointerEvents}
          {...keyboardEvents}
        >
          {children}
        </RectangularButton>
      ) : (
        <CircularButton
          ref={dragRef}
          $initialPosition={initialPosition}
          $diameter={width}
          $areItemsDraggable={areItemsDraggable}
          aria-label={ariaLabel}
          onClick={onClick}
          {...pointerEvents}
          {...keyboardEvents}
        >
          {children}
        </CircularButton>
      )}
    </Draggable>
  );
};
