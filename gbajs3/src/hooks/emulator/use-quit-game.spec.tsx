import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useQuitGame } from './use-quit-game.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import * as fadeCanvas from '../../components/screen/fade.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('useQuitGame hook', () => {
  it('quits game if the emulator exists', async () => {
    const emulatorQuitGameSpy: () => void = vi.fn();
    const screenShotSpy: (cb: () => void) => void = vi.fn((cb) => cb());
    const setIsRunningSpy = vi.fn();
    const fadeCanvasSpy = vi.fn();
    const testCanvas = {} as HTMLCanvasElement;

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: testCanvas,
      emulator: {
        quitGame: emulatorQuitGameSpy,
        screenShot: screenShotSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: true,
      setIsRunning: setIsRunningSpy
    }));

    vi.spyOn(fadeCanvas, 'fadeCanvas').mockImplementation(fadeCanvasSpy);

    const { result } = renderHookWithContext(() => useQuitGame());

    act(() => {
      result.current();
    });

    expect(fadeCanvasSpy).toHaveBeenCalledOnce();
    expect(fadeCanvasSpy).toHaveBeenCalledWith(testCanvas, screenShotSpy);

    expect(emulatorQuitGameSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledWith(false);
  });

  it('sets running to false if there is no emulator', () => {
    const setIsRunningSpy = vi.fn();
    const fadeCanvasSpy = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: null
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: true,
      setIsRunning: setIsRunningSpy
    }));

    vi.spyOn(fadeCanvas, 'fadeCanvas').mockImplementation(fadeCanvasSpy);

    const { result } = renderHookWithContext(() => useQuitGame());

    act(() => {
      result.current();
    });

    expect(fadeCanvasSpy).not.toHaveBeenCalled();

    expect(setIsRunningSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledWith(false);
  });
});
