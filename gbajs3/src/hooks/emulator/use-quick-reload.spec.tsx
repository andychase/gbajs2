import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useQuickReload } from './use-quick-reload.tsx';
import * as runGameHooks from './use-run-game.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorGameNameLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('useQuickReload hook', () => {
  it('quick reloads using the emulator if running', async () => {
    const emulatorQuickReloadSpy: () => void = vi.fn();
    const setIsRunningSpy = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        getCurrentGameName: () => undefined,
        quickReload: emulatorQuickReloadSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: true,
      setIsRunning: setIsRunningSpy
    }));

    const { result } = renderHookWithContext(() => useQuickReload());

    act(() => {
      result.current();
    });

    expect(emulatorQuickReloadSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).not.toHaveBeenCalled();
  });

  it('quick reloads last stored game name in the emulator', async () => {
    const emulatorQuickReloadSpy: () => void = vi.fn();
    const runGameSpy = vi.fn(() => true);
    const setIsRunningSpy = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        getCurrentGameName: () => 'some_rom.gba'
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: false,
      setIsRunning: setIsRunningSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    const { result } = renderHookWithContext(() => useQuickReload());

    act(() => {
      result.current();
    });

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('some_rom.gba');
    expect(emulatorQuickReloadSpy).not.toHaveBeenCalled();

    expect(setIsRunningSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledWith(true);
  });

  it('quick reloads last stored game name in the localStorage', async () => {
    const emulatorQuickReloadSpy: () => void = vi.fn();
    const runGameSpy = vi.fn(() => true);
    const setIsRunningSpy = vi.fn();

    localStorage.setItem(emulatorGameNameLocalStorageKey, '"some_rom_2.gba"');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        getCurrentGameName: () => undefined
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: false,
      setIsRunning: setIsRunningSpy
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    const { result } = renderHookWithContext(() => useQuickReload());

    act(() => {
      result.current();
    });

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('some_rom_2.gba');
    expect(emulatorQuickReloadSpy).not.toHaveBeenCalled();

    expect(setIsRunningSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledWith(true);
  });
});
