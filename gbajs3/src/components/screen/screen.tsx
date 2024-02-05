import { useMediaQuery } from '@mui/material';
import { useCallback } from 'react';
import { Rnd, type Props as RndProps } from 'react-rnd';
import { styled, useTheme } from 'styled-components';

import { useEmulatorContext, useLayoutContext } from '../../hooks/context.tsx';
import { NavigationMenuWidth } from '../navigation-menu/consts.tsx';
import { GripperHandle } from '../shared/gripper-handle.tsx';

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

const ScreenWrapper = styled(Rnd)<RndProps>`
  background-color: ${({ theme }) => theme.pureBlack};
  border: solid 1px ${({ theme }) => theme.pureBlack};
  overflow: visible;
  width: 100dvw;

  @media ${({ theme }) => theme.isLargerThanPhone} {
    width: calc(100dvw - ${NavigationMenuWidth + 35}px);
  }
`;

export const Screen = () => {
  const theme = useTheme();
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const { setCanvas, areItemsDraggable, areItemsResizable } =
    useEmulatorContext();
  const { layouts, setLayout, hasSetLayout } = useLayoutContext();
  const screenWrapperXStart = isLargerThanPhone ? NavigationMenuWidth + 10 : 0;
  const screenWrapperYStart = isLargerThanPhone ? 15 : 0;

  const refUpdateDefaultPosition = useCallback(
    (node: Rnd | null) => {
      if (!hasSetLayout)
        node?.resizableElement?.current?.style?.removeProperty('width');

      if (!layouts?.screen?.initialBounds && node)
        setLayout('screen', {
          initialBounds: node.resizableElement.current?.getBoundingClientRect()
        });
    },
    [hasSetLayout, layouts, setLayout]
  );

  const refSetCanvas = useCallback(
    (node: HTMLCanvasElement | null) => setCanvas(node),
    [setCanvas]
  );

  const defaultPosition = {
    x: screenWrapperXStart,
    y: screenWrapperYStart
  };
  const defaultSize = {
    width: isLargerThanPhone ? '' : '100dvw',
    height: isLargerThanPhone ? 'auto' : '66.67dvw'
  };

  const position = layouts?.screen?.position ?? defaultPosition;
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
      default={{
        ...defaultPosition,
        ...defaultSize
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
