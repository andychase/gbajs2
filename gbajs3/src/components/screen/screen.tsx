import { useMediaQuery } from '@mui/material';
import { useCallback, useContext, useState } from 'react';
import { Rnd } from 'react-rnd';
import { styled, useTheme } from 'styled-components';

import { renderCanvasWidth, renderCanvasHeight } from './consts.tsx';
import { EmulatorContext } from '../../context/emulator/emulator.tsx';
import { NavigationMenuWidth } from '../navigation-menu/consts.tsx';
import { GripperHandle } from '../shared/gripper-handle.tsx';

type RenderCanvasProps = {
  $pixelated?: boolean;
};

const RenderCanvas = styled.canvas<RenderCanvasProps>`
  background-color: ${({ theme }) => theme.screenLight};
  image-rendering: -webkit-optimize-contrast;
  image-rendering: -moz-crisp-edges;
  image-rendering: -o-crisp-edges;
  width: 100%;
  height: 100%;
  display: block;

  ${({ $pixelated = false }) =>
    $pixelated &&
    `image-rendering: pixelated;
    `}
`;

const ScreenWrapper = styled(Rnd)`
  border: solid 1px black;
  overflow: visible;
  width: 100dvw;

  @media ${({ theme }) => theme.isLargerThanPhone} {
    width: calc(100dvw - ${NavigationMenuWidth + 25}px);
  }
`;

export const Screen = () => {
  const theme = useTheme();
  const [hasDraggedOrResized, setHasDraggedOrResized] = useState(false);
  const isLargerThanPhone = useMediaQuery(theme.isLargerThanPhone);
  const { setCanvas, areItemsDraggable, areItemsResizable } =
    useContext(EmulatorContext);
  const screenWrapperXStart = isLargerThanPhone ? NavigationMenuWidth + 10 : 0;
  const screenWrapperYStart = isLargerThanPhone ? 15 : 0;

  const refUpdateDefaultPosition = useCallback(
    (node: Rnd | null) => {
      if (!hasDraggedOrResized) {
        node?.updatePosition({
          x: screenWrapperXStart,
          y: screenWrapperYStart
        });
      }
    },
    [hasDraggedOrResized, screenWrapperXStart, screenWrapperYStart]
  );

  const refSetCanvas = useCallback(
    (node: HTMLCanvasElement | null) => setCanvas(node),
    [setCanvas]
  );

  return (
    <ScreenWrapper
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
        x: isLargerThanPhone ? screenWrapperXStart : 0,
        y: isLargerThanPhone ? screenWrapperYStart : 0,
        width: 'auto',
        height: 'auto'
      }}
      // initial width needs to be controlled from css
      size={{ width: '', height: 'auto' }}
      lockAspectRatio={3 / 2}
      onResizeStart={() => setHasDraggedOrResized(true)}
      onDragStart={() => setHasDraggedOrResized(true)}
    >
      <RenderCanvas
        ref={refSetCanvas}
        width={renderCanvasWidth}
        height={renderCanvasHeight}
        $pixelated
      />
    </ScreenWrapper>
  );
};
