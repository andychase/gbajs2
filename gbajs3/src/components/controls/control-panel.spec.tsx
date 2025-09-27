import { screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ControlPanel } from './control-panel.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import {
  emulatorFFMultiplierLocalStorageKey,
  emulatorSettingsLocalStorageKey,
  emulatorVolumeLocalStorageKey
} from '../../context/emulator/consts.ts';
import { GbaDarkTheme } from '../../context/theme/theme.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as quitGameHooks from '../../hooks/emulator/use-quit-game.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<ControlPanel />', () => {
  const initialPos = {
    clientX: 0,
    clientY: 0
  };
  const movements = [
    { clientX: 200, clientY: 220 },
    { clientX: 150, clientY: 120 }
  ];

  beforeEach(async () => {
    const { useInitialBoundsContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useInitialBoundsContext').mockImplementation(
      () => ({
        ...original(),
        initialBounds: { screen: { left: 0, bottom: 0 } as DOMRect }
      })
    );
  });

  it('renders panel controls', async () => {
    renderWithContext(<ControlPanel />);

    expect(screen.getByRole('list')).toBeVisible();

    expect(screen.getByLabelText('Play')).toBeVisible();
    expect(screen.getByLabelText('Quit Game')).toBeVisible();
    expect(screen.getByLabelText('Drag Items')).toBeVisible();
    expect(screen.getByLabelText('Resize Items')).toBeVisible();
    expect(screen.getByLabelText('Volume Slider')).toBeVisible();
    expect(screen.getByLabelText('Fast Forward Slider')).toBeVisible();
  });

  it('renders with default mobile position and size', () => {
    renderWithContext(<ControlPanel />);

    const controlPanelWrapper = screen.getByTestId('control-panel-wrapper');

    expect(controlPanelWrapper).toHaveStyle({
      // note: width and height using dynamic viewport units is not properly respected
      // see: https://github.com/jsdom/jsdom/issues/1332
      width: '100dvw',
      height: 'auto',
      transform: `translate(0px,0px)`
    });
    // snapshot due to the above comment, attempting to capture more in the interim
    expect(controlPanelWrapper).toMatchSnapshot();
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

    renderWithContext(<ControlPanel />);

    const controlPanelWrapper = screen.getByTestId('control-panel-wrapper');

    expect(controlPanelWrapper).toHaveStyle({
      width: 'auto',
      height: 'auto',
      // See: https://github.com/bokuweb/react-rnd/issues/846, in jsdom react-rnd is rendering with
      // 2x transform values after the first render in test only, actual browser render is correct
      transform: `translate(0px,${5 * 2}px)`
    });
    expect(controlPanelWrapper).toMatchSnapshot();
  });

  it('sets initial bounds when rendered', async () => {
    const setInitialBoundSpy = vi.fn();

    const { useInitialBoundsContext: originalBounds } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useInitialBoundsContext').mockImplementation(
      () => ({
        ...originalBounds(),
        setInitialBound: setInitialBoundSpy
      })
    );

    renderWithContext(<ControlPanel />);

    expect(setInitialBoundSpy).toHaveBeenCalledWith('controlPanel', {
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

    renderWithContext(<ControlPanel />);

    setLayoutSpy.mockClear(); // clear calls from initial render

    // simulate mouse events on wrapper
    fireEvent.mouseDown(
      screen.getByTestId('control-panel-wrapper'),
      initialPos
    );
    fireEvent.mouseMove(document, movements[0]);

    expect(setLayoutSpy).toHaveBeenCalledOnce();
    expect(setLayoutSpy).toHaveBeenCalledWith('controlPanel', {
      originalBounds: {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0
      }
    });

    fireEvent.mouseUp(document, movements[1]);

    expect(setLayoutSpy).toHaveBeenCalledTimes(2);
    expect(setLayoutSpy).toHaveBeenCalledWith('controlPanel', {
      position: {
        x: movements[1].clientX,
        y: movements[1].clientY
      }
    });
  });

  it('sets layout on resize', async () => {
    const setLayoutSpy = vi.fn();
    const { useResizeContext: originalResize } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useResizeContext').mockImplementation(() => ({
      ...originalResize(),
      areItemsResizable: true
    }));

    // needs to be a consistent object
    const testLayout = {
      clearLayouts: vi.fn(),
      setLayout: setLayoutSpy,
      setLayouts: vi.fn(),
      layouts: {},
      getLayout: () => undefined
    };

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(
      () => testLayout
    );

    renderWithContext(<ControlPanel />);

    setLayoutSpy.mockClear(); // clear calls from initial render

    fireEvent.resize(screen.getByTestId('control-panel-wrapper'));

    // simulate mouse events on a resize handle
    fireEvent.mouseDown(screen.getAllByTestId('gripper-handle')[0], initialPos);
    fireEvent.mouseMove(document, movements[0]);

    expect(setLayoutSpy).toHaveBeenCalledOnce();
    expect(setLayoutSpy).toHaveBeenCalledWith('controlPanel', {
      originalBounds: {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0
      }
    });

    fireEvent.mouseUp(document, movements[1]);

    expect(setLayoutSpy).toHaveBeenCalledTimes(2);
    expect(setLayoutSpy).toHaveBeenCalledWith('controlPanel', {
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

  describe('PanelControls', () => {
    it('toggles emulator play', async () => {
      const emulatorPauseSpy: () => void = vi.fn();
      const emulatorResumeSpy: () => void = vi.fn();
      const {
        useEmulatorContext: originalEmulator,
        useRunningContext: originalRunning
      } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          pause: emulatorPauseSpy,
          resume: emulatorResumeSpy
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Pause'));

      expect(screen.getByLabelText('Play')).toBeVisible();
      expect(emulatorPauseSpy).toHaveBeenCalledOnce();

      await userEvent.click(screen.getByLabelText('Play'));

      expect(screen.getByLabelText('Pause')).toBeVisible();
      expect(emulatorResumeSpy).toHaveBeenCalledOnce();
    });

    it('quits the emulated game', async () => {
      const quitGameSpy: () => void = vi.fn();
      const { useRunningContext: originalRunning } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        ...originalRunning(),
        isRunning: true
      }));

      vi.spyOn(quitGameHooks, 'useQuitGame').mockReturnValue(quitGameSpy);

      renderWithContext(<ControlPanel />);
      // game is running and paused
      await userEvent.click(screen.getByLabelText('Pause'));
      expect(screen.getByLabelText('Play')).toBeVisible();

      await userEvent.click(screen.getByLabelText('Quit Game'));

      expect(quitGameSpy).toHaveBeenCalledOnce();
      // sets paused to false, note emulator still running due to mock
      expect(screen.getByLabelText('Pause')).toBeVisible();
    });

    it('toggles whether items are draggable', async () => {
      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Drag Items'));

      expect(screen.getByLabelText('Anchor Items')).toBeVisible();

      await userEvent.click(screen.getByLabelText('Anchor Items'));

      expect(screen.getByLabelText('Drag Items')).toBeVisible();
    });

    it('toggles whether items are resizable', async () => {
      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Resize Items'));

      expect(screen.getByLabelText('Stop Resizing Items')).toBeVisible();
      expect(screen.getAllByTestId('gripper-handle')).toHaveLength(2);

      await userEvent.click(screen.getByLabelText('Stop Resizing Items'));

      expect(screen.getByLabelText('Resize Items')).toBeVisible();
      expect(screen.queryAllByTestId('gripper-handle')).toHaveLength(0);
    });

    it('toggles emulator rewind', async () => {
      const toggleRewindSpy: (v: boolean) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          toggleRewind: toggleRewindSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      fireEvent.pointerDown(screen.getByLabelText('Rewind Emulator'));

      expect(toggleRewindSpy).toHaveBeenCalledOnce();
      expect(toggleRewindSpy).toHaveBeenCalledWith(true);

      fireEvent.pointerUp(screen.getByLabelText('Rewind Emulator'));

      expect(toggleRewindSpy).toHaveBeenCalledTimes(2);
      expect(toggleRewindSpy).toHaveBeenCalledWith(true);
    });

    it('mutes emulator when rewinding if setting is ON', async () => {
      const setVolumeSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          toggleRewind: vi.fn() as (v: boolean) => void,
          setVolume: setVolumeSpy
        } as GBAEmulator
      }));

      localStorage.setItem(
        emulatorSettingsLocalStorageKey,
        '{"muteOnRewind":true}'
      );

      renderWithContext(<ControlPanel />);

      fireEvent.pointerDown(screen.getByLabelText('Rewind Emulator'));

      expect(setVolumeSpy).toHaveBeenCalledOnce();
      expect(setVolumeSpy).toHaveBeenCalledWith(0);

      fireEvent.pointerUp(screen.getByLabelText('Rewind Emulator'));

      expect(setVolumeSpy).toHaveBeenCalledTimes(2);
      expect(setVolumeSpy).toHaveBeenLastCalledWith(1);
    });

    it('mutes volume', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const emulatorSetVolumeSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          setVolume: emulatorSetVolumeSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Mute Volume'));

      expect(emulatorSetVolumeSpy).toHaveBeenCalledOnce();
      expect(emulatorSetVolumeSpy).toHaveBeenCalledWith(0);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorVolumeLocalStorageKey,
        '0'
      );
    });

    it('sets volume with slider', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const emulatorSetVolumeSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          setVolume: emulatorSetVolumeSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      fireEvent.change(screen.getByLabelText('Volume Slider'), {
        target: { value: 0.5 }
      });

      expect(emulatorSetVolumeSpy).toHaveBeenCalledOnce();
      expect(emulatorSetVolumeSpy).toHaveBeenCalledWith(0.5);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorVolumeLocalStorageKey,
        '0.5'
      );
    });

    it('sets max volume', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const emulatorSetVolumeSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        emulator: {
          setVolume: emulatorSetVolumeSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Max Volume'));

      expect(emulatorSetVolumeSpy).toHaveBeenCalledOnce();
      expect(emulatorSetVolumeSpy).toHaveBeenCalledWith(1);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorVolumeLocalStorageKey,
        '1'
      );
    });

    it('renders initial volume from storage', () => {
      localStorage.setItem(emulatorVolumeLocalStorageKey, '0.75');

      renderWithContext(<ControlPanel />);

      expect(screen.getByLabelText('Volume Slider')).toHaveDisplayValue('0.75');
    });

    it('turns off fast forward', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const ffMultiplierSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        emulator: {
          setFastForwardMultiplier: ffMultiplierSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Regular Speed'));

      expect(ffMultiplierSpy).toHaveBeenCalledOnce();
      expect(ffMultiplierSpy).toHaveBeenCalledWith(1);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorFFMultiplierLocalStorageKey,
        '1'
      );
    });

    it('sets fast forward with slider', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const ffMultiplierSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        emulator: {
          setFastForwardMultiplier: ffMultiplierSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      fireEvent.change(screen.getByLabelText('Fast Forward Slider'), {
        target: { value: 3 }
      });

      expect(ffMultiplierSpy).toHaveBeenCalledOnce();
      expect(ffMultiplierSpy).toHaveBeenCalledWith(3);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorFFMultiplierLocalStorageKey,
        '3'
      );
    });

    it('sets max fast forward', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const ffMultiplierSpy: (v: number) => void = vi.fn();
      const { useEmulatorContext: originalEmulator } = await vi.importActual<
        typeof contextHooks
      >('../../hooks/context.tsx');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...originalEmulator(),
        isEmulatorRunning: true,
        emulator: {
          setFastForwardMultiplier: ffMultiplierSpy
        } as GBAEmulator
      }));

      renderWithContext(<ControlPanel />);

      await userEvent.click(screen.getByLabelText('Max Fast Forward'));

      expect(ffMultiplierSpy).toHaveBeenCalledOnce();
      expect(ffMultiplierSpy).toHaveBeenCalledWith(5);
      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorFFMultiplierLocalStorageKey,
        '5'
      );
    });

    it('renders initial fast forward from storage', () => {
      localStorage.setItem(emulatorFFMultiplierLocalStorageKey, '4');

      renderWithContext(<ControlPanel />);

      expect(screen.getByLabelText('Fast Forward Slider')).toHaveDisplayValue(
        '4'
      );
    });
  });

  it('mutes emulator when fast forwarding if setting is ON', async () => {
    const ffMultiplierSpy: (v: number) => void = vi.fn();
    const setVolumeSpy: (v: number) => void = vi.fn();
    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        setFastForwardMultiplier: ffMultiplierSpy,
        setVolume: setVolumeSpy
      } as GBAEmulator
    }));

    localStorage.setItem(
      emulatorSettingsLocalStorageKey,
      '{"muteOnFastForward":true}'
    );

    renderWithContext(<ControlPanel />);

    await userEvent.click(screen.getByLabelText('Max Fast Forward'));

    expect(setVolumeSpy).toHaveBeenCalledOnce();
    expect(setVolumeSpy).toHaveBeenCalledWith(0);

    await userEvent.click(screen.getByLabelText('Regular Speed'));

    expect(setVolumeSpy).toHaveBeenCalledTimes(2);
    expect(setVolumeSpy).toHaveBeenLastCalledWith(1);
  });
});
