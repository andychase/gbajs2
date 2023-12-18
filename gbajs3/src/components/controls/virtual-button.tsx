import { useContext, useRef, type ReactNode } from 'react';
import Draggable from 'react-draggable';
import { styled } from 'styled-components';

import { EmulatorContext } from '../../context/emulator/emulator.tsx';
import { LayoutContext } from '../../context/layout/layout.tsx';
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
`;

const CircularButton = styled(VirtualButtonBase)<CircularButtonProps>`
  width: ${({ $diameter = 60 }) => $diameter}px;
  height: ${({ $diameter = 60 }) => $diameter}px;
  border-radius: 100px;
  border-color: ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable ? theme.gbaThemeBlue : 'rgba(255, 255, 255, 0.9)'};
  border-style: ${({ $areItemsDraggable = false }) =>
    $areItemsDraggable ? 'dashed' : 'solid'};

  ${({ $initialPosition = { top: '0', left: '0' } }) =>
    `
    top: ${$initialPosition.top};
    left: ${$initialPosition.left};
    `}
`;

const RectangularButton = styled(VirtualButtonBase)<RectangularButtonProps>`
  border-radius: 16px;
  width: fit-content;
  min-width: 85px;
  border-color: ${({ $areItemsDraggable = false, theme }) =>
    $areItemsDraggable ? theme.gbaThemeBlue : 'rgba(255, 255, 255, 0.9)'};
  border-style: ${({ $areItemsDraggable = false }) =>
    $areItemsDraggable ? 'dashed' : 'solid'};

  ${({ $initialPosition = { top: '0', left: '0' } }) =>
    `
    top: ${$initialPosition.top};
    left: ${$initialPosition.left};
    `}
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
  const { emulator, areItemsDraggable } = useContext(EmulatorContext);
  const { layouts, setLayout } = useContext(LayoutContext);
  const dragRef = useRef<HTMLButtonElement | null>(null);

  if (!enabled) return null;

  const clickEvents = onClick ? { onClick } : {};
  const pointerEvents = keyId
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
    : {};
  // due to using pointer events for the buttons without a click handler,
  // we need to manage key events ourselves for buttons with an emulator keyId
  const keyboardEvents = keyId
    ? {
        onKeyDown: (e: KeyboardEvent) => {
          if (e.code == 'Space' || e.key == ' ')
            emulator?.simulateKeyDown(keyId);
        },
        onKeyUp: (e: KeyboardEvent) => {
          if (e.code == 'Space' || e.key == ' ') emulator?.simulateKeyUp(keyId);
        }
      }
    : {};

  const position = layouts?.[inputName]?.position ?? { x: 0, y: 0 };

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
          {...pointerEvents}
          {...clickEvents}
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
          {...pointerEvents}
          {...clickEvents}
          {...keyboardEvents}
        >
          {children}
        </CircularButton>
      )}
    </Draggable>
  );
};
