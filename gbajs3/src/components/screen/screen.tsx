import { useMediaQuery } from '@mui/material';
import { useOrientation } from '@uidotdev/usehooks';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { Rnd, type Props as RndProps } from 'react-rnd';
import { styled, useTheme } from 'styled-components';

import {
  useDragContext,
  useEmulatorContext,
  useLayoutContext,
  useResizeContext
} from '../../hooks/context.tsx';
import { NavigationMenuWidth } from '../navigation-menu/consts.tsx';
import { GripperHandle } from '../shared/gripper-handle.tsx';

type ScreenWrapperProps = RndProps & { $areItemsDraggable: boolean };

const defaultGBACanvasWidth = 240;
const defaultGBACanvasHeight = 160;

const RenderCanvas = styled.canvas`
  background-color: ${({ theme }) => theme.pureBlack};
  image-rendering: -webkit-optimize-contrast;
  image-rendering: -moz-crisp-edges;
  image-rendering: -o-crisp-edges;
  width: 100%;
  height: 100%;
  display: block;
  margin: 0 auto;
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  image-rendering: pixelated;
`;

const ScreenWrapper = styled(Rnd)<ScreenWrapperProps>`
  background-color: ${({ theme }) => theme.pureBlack};
  overflow: visible;
  width: 100dvw;
  height: calc(100dvw * 2 / 3);

  @media ${({ theme }) => theme.isLargerThanPhone} {
    width: min(
      calc(100dvw - ${NavigationMenuWidth + 35}px),
      calc(85dvh * 3 / 2)
    );
    height: 85dvh;
  }

  @media ${({ theme }) => theme.isMobileLandscape} {
    width: calc(100dvh * (3 / 2));
    height: 100dvh;
  }

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    margin: 2px;
    pointer-events: none;
    border: 2px dashed ${({ theme }) => theme.gbaThemeBlue};
    visibility: ${({ $areItemsDraggable }) =>
      $areItemsDraggable ? 'visible' : 'hidden'};
  }
`;

// overrides rnd styles to fallback to css
const defaultSize = {
  width: '',
  height: ''
};

export const Screen = () => {
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone, {
    noSsr: true
  });
  const isMobileLandscape = useMediaQuery(theme.isMobileLandscape, {
    noSsr: true
  });
  const { setCanvas } = useEmulatorContext();
  const { areItemsDraggable } = useDragContext();
  const { areItemsResizable } = useResizeContext();
  const { layouts, setLayout, hasSetLayout } = useLayoutContext();
  const screenWrapperXStart = isLargerThanPhone ? NavigationMenuWidth + 10 : 0;
  const screenWrapperYStart = isLargerThanPhone && !isMobileLandscape ? 15 : 0;
  const rndRef = useRef<Rnd | null>();
  const orientation = useOrientation();

  const refUpdateDefaultPosition = useCallback(
    (node: Rnd | null) => {
      if (!hasSetLayout) {
        node?.resizableElement?.current?.style?.removeProperty('width');
        node?.resizableElement?.current?.style?.removeProperty('height');
      }

      if (!hasSetLayout && node)
        setLayout('screen', {
          initialBounds: node.resizableElement.current?.getBoundingClientRect()
        });

      if (!rndRef.current) rndRef.current = node;
    },
    [hasSetLayout, setLayout]
  );

  useLayoutEffect(() => {
    if (!hasSetLayout && [0, 90, 270].includes(orientation.angle))
      setLayout('screen', {
        initialBounds:
          rndRef.current?.resizableElement?.current?.getBoundingClientRect()
      });
  }, [hasSetLayout, isMobileLandscape, setLayout, orientation.angle]);

  const refSetCanvas = useCallback(
    (node: HTMLCanvasElement | null) => setCanvas(node),
    [setCanvas]
  );

  const currentDimensions =
    rndRef?.current?.resizableElement?.current?.getBoundingClientRect();
  const width = currentDimensions?.width ?? 0;
  const height = currentDimensions?.height ?? 0;
  const position =
    layouts?.screen?.position ??
    (isMobileLandscape
      ? {
          x: Math.floor(document.documentElement.clientWidth / 2 - width / 2),
          y: Math.floor(document.documentElement.clientHeight / 2 - height / 2)
        }
      : {
          x: screenWrapperXStart,
          y: screenWrapperYStart
        });
  const size = layouts?.screen?.size ?? defaultSize;

  return (
    <ScreenWrapper
      data-testid="screen-wrapper"
      disableDragging={!areItemsDraggable}
      ref={refUpdateDefaultPosition}
      enableResizing={areItemsResizable}
      resizeHandleComponent={{
        topRight: <GripperHandle variation="topRight" />,
        bottomRight: <GripperHandle variation="bottomRight" />,
        bottomLeft: <GripperHandle variation="bottomLeft" />,
        topLeft: <GripperHandle variation="topLeft" />
      }}
      resizeHandleStyles={{
        topRight: { marginTop: '15px', marginRight: '15px' },
        bottomRight: { marginBottom: '15px', marginRight: '15px' },
        bottomLeft: { marginBottom: '15px', marginLeft: '15px' },
        topLeft: { marginTop: '15px', marginLeft: '15px' }
      }}
      position={position}
      size={size}
      onDragStop={(_, data) => {
        setLayout('screen', { position: { x: data.x, y: data.y } });
      }}
      onResizeStop={(_1, _2, ref, _3, position) => {
        setLayout('screen', {
          size: { width: ref.clientWidth, height: ref.clientHeight },
          position: { ...position }
        });
      }}
      $areItemsDraggable={areItemsDraggable}
    >
      <RenderCanvas
        data-testid="screen-wrapper:render-canvas"
        ref={refSetCanvas}
        width={defaultGBACanvasWidth}
        height={defaultGBACanvasHeight}
      />
    </ScreenWrapper>
  );
};
