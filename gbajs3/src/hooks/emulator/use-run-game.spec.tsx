import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRunGame } from './use-run-game.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import {
  emulatorGameNameLocalStorageKey,
  emulatorFFMultiplierLocalStorageKey,
  emulatorKeyBindingsLocalStorageKey
} from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type {
  GBAEmulator,
  KeyBinding
} from '../../emulator/mgba/mgba-emulator.tsx';

describe('useRunGame hook', () => {
  it('runs game sets default and stored values', () => {
    const setIsRunningSpy = vi.fn();
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);
    const emulatorSetVolumeSpy: (v: number) => void = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        run: emulatorRunSpy,
        setVolume: emulatorSetVolumeSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: false,
      setIsRunning: setIsRunningSpy
    }));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHookWithContext(() => useRunGame());

    act(() => {
      expect(result.current('/games/some_rom.gba')).toBeTruthy();
    });

    expect(emulatorRunSpy).toHaveBeenCalledOnce();
    expect(emulatorRunSpy).toHaveBeenCalledWith('/games/some_rom.gba');

    expect(setIsRunningSpy).toHaveBeenCalledOnce();
    expect(setIsRunningSpy).toHaveBeenCalledWith(true);

    // set stored game name
    expect(setItemSpy).toHaveBeenCalledWith(
      emulatorGameNameLocalStorageKey,
      '"/games/some_rom.gba"'
    );

    // set volume
    expect(emulatorSetVolumeSpy).toHaveBeenCalledOnce();
    expect(emulatorSetVolumeSpy).toHaveBeenCalledWith(1);
  });

  it('sets keybindings and fast forward from storage on success', () => {
    localStorage.setItem(
      emulatorKeyBindingsLocalStorageKey,
      '"some set of keybindings"'
    );

    localStorage.setItem(emulatorFFMultiplierLocalStorageKey, '2');

    const setIsRunningSpy = vi.fn();
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);
    const emulatorRemapKeyBindingsSpy: (keyBindings: KeyBinding[]) => void =
      vi.fn();
    const emulatorSetFastForwardMultiplierSpy: (multiplier: number) => void =
      vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        run: emulatorRunSpy,
        isFastForwardEnabled: () => false,
        setVolume: vi.fn() as (v: number) => void,
        remapKeyBindings: emulatorRemapKeyBindingsSpy,
        setFastForwardMultiplier: emulatorSetFastForwardMultiplierSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: false,
      setIsRunning: setIsRunningSpy
    }));

    const { result } = renderHookWithContext(() => useRunGame());

    act(() => {
      expect(result.current('/games/some_rom.gba')).toBeTruthy();
    });

    expect(emulatorRemapKeyBindingsSpy).toHaveBeenCalledOnce();
    expect(emulatorRemapKeyBindingsSpy).toHaveBeenCalledWith(
      'some set of keybindings'
    );

    expect(emulatorSetFastForwardMultiplierSpy).toHaveBeenCalledOnce();
    expect(emulatorSetFastForwardMultiplierSpy).toHaveBeenCalledWith(2);
  });
});
