import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Screen } from './screen.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import { GbaDarkTheme } from '../../context/theme/theme.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { NavigationMenuWidth } from '../navigation-menu/consts.tsx';

vi.mock('../../hooks/use-emulator.tsx', () => ({
  useEmulator: () => null
}));

describe('<Screen />', () => {
  const initialPos = {
    clientX: 0,
    clientY: 0
  };
  const movements = [
    { clientX: 200, clientY: 220 },
    { clientX: 150, clientY: 120 }
  ];

  it('sets context canvas when rendered', async () => {
    const setCanvasSpy = vi.fn();
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      setCanvas: setCanvasSpy
    }));

    renderWithContext(<Screen />);

    const canvas = screen.getByTestId('screen-wrapper:render-canvas');

    expect(setCanvasSpy).toHaveBeenCalledOnce();
    expect(setCanvasSpy).toHaveBeenCalledWith(canvas);
  });

  it('sets initial bounds when rendered', async () => {
    const setInitialBoundSpy = vi.fn();

    const { useLayoutContext: originalLayout } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...originalLayout(),
      setInitialBound: setInitialBoundSpy
    }));

    renderWithContext(<Screen />);

    expect(setInitialBoundSpy).toHaveBeenCalledWith('screen', {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0
    });
  });

  it('renders with default mobile position and size', () => {
    renderWithContext(<Screen />);

    const canvas = screen.getByTestId('screen-wrapper:render-canvas');
    const screenWrapper = screen.getByTestId('screen-wrapper');

    expect(canvas).toHaveAttribute('width', '240');
    expect(canvas).toHaveAttribute('height', '160');

    expect(screenWrapper).toHaveStyle({
      // note: width and height using dynamic viewport units is not properly respected
      // see: https://github.com/jsdom/jsdom/issues/1332
      width: '100dvw',
      height: 'calc(100dvw * 2 / 3)',
      transform: `translate(0px,0px)`
    });
    // snapshot due to the above comment, attempting to capture more in the interim
    expect(screenWrapper).toMatchSnapshot();
  });

  it('renders with default desktop position and size', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === GbaDarkTheme.isLargerThanPhone,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      onchange: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    }));

    renderWithContext(<Screen />);

    const canvas = screen.getByTestId('screen-wrapper:render-canvas');
    const screenWrapper = screen.getByTestId('screen-wrapper');

    expect(canvas).toHaveAttribute('width', '240');
    expect(canvas).toHaveAttribute('height', '160');

    expect(screenWrapper).toHaveStyle({
      // see: https://github.com/jsdom/jsdom/issues/1332
      height: 'calc(100dvw * 2 / 3)', // should be '85dvh'
      // See: https://github.com/bokuweb/react-rnd/issues/846, in jsdom react-rnd is rendering with
      // 2x transform values after the first render in test only, actual browser render is correct
      transform: `translate(${(NavigationMenuWidth + 10) * 2}px,${15 * 2}px)`
    });

    expect(screenWrapper).toMatchSnapshot();
  });

  it('sets layout on drag', async () => {
    const setLayoutSpy = vi.fn();
    const { useLayoutContext: originalLayout, useDragContext: originalDrag } =
      await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useDragContext').mockImplementation(() => ({
      ...originalDrag(),
      areItemsDraggable: true
    }));

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...originalLayout(),
      setLayout: setLayoutSpy
    }));

    renderWithContext(<Screen />);

    // simulate mouse events on wrapper
    fireEvent.mouseDown(screen.getByTestId('screen-wrapper'), initialPos);
    fireEvent.mouseMove(document, movements[0]);
    fireEvent.mouseUp(document, movements[1]);

    expect(setLayoutSpy).toHaveBeenCalledOnce();
    expect(setLayoutSpy).toHaveBeenCalledWith('screen', {
      position: {
        x: movements[1].clientX,
        y: movements[1].clientY
      }
    });
  });

  it('sets layout on resize', async () => {
    const setLayoutSpy = vi.fn();
    const {
      useLayoutContext: originalLayout,
      useResizeContext: originalResize
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useResizeContext').mockImplementation(() => ({
      ...originalResize(),
      areItemsResizable: true
    }));

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...originalLayout(),
      setLayout: setLayoutSpy,
      initialBounds: { screen: new DOMRect() }
    }));

    renderWithContext(<Screen />);

    expect(screen.getAllByTestId('gripper-handle')).toHaveLength(4);

    // simulate mouse events on a resize handle
    fireEvent.mouseDown(screen.getAllByTestId('gripper-handle')[0], initialPos);
    fireEvent.mouseMove(document, movements[0]);
    fireEvent.mouseUp(document, movements[1]);

    expect(setLayoutSpy).toHaveBeenCalledOnce();
    expect(setLayoutSpy).toHaveBeenCalledWith('screen', {
      position: {
        x: expect.anything(),
        y: expect.anything()
      },
      size: {
        height: expect.anything(),
        width: expect.anything()
      }
    });
  });
});
