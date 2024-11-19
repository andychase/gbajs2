import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRunGame } from './use-run-game.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import {
  emulatorGameNameLocalStorageKey,
  emulatorFFMultiplierLocalStorageKey,
  emulatorKeyBindingsLocalStorageKey,
  emulatorCoreCallbacksLocalStorageKey
} from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbacksHooks from '../../hooks/emulator/use-add-callbacks.tsx';

import type { CoreCallbackOptions } from './use-add-callbacks.tsx';
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

    vi.spyOn(addCallbacksHooks, 'useAddCallbacks').mockImplementation(() => ({
      addCallbacks: vi.fn(),
      addCallbacksAndSaveSettings: vi.fn(),
      syncActionIfEnabled: vi.fn()
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

  it('sets keybindings, fast forward, and callbacks from storage on success', () => {
    localStorage.setItem(
      emulatorKeyBindingsLocalStorageKey,
      '"some set of keybindings"'
    );

    localStorage.setItem(emulatorFFMultiplierLocalStorageKey, '2');
    localStorage.setItem(
      emulatorCoreCallbacksLocalStorageKey,
      '{"saveFileSystemOnInGameSave": true}'
    );

    const setIsRunningSpy = vi.fn();
    const emulatorRunSpy: (romPath: string) => boolean = vi.fn(() => true);
    const emulatorRemapKeyBindingsSpy: (keyBindings: KeyBinding[]) => void =
      vi.fn();
    const emulatorSetFastForwardMultiplierSpy: (multiplier: number) => void =
      vi.fn();
    const addCallbacksSpy: (f: CoreCallbackOptions) => void = vi.fn();

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

    vi.spyOn(addCallbacksHooks, 'useAddCallbacks').mockImplementation(() => ({
      addCallbacks: addCallbacksSpy,
      addCallbacksAndSaveSettings: vi.fn(),
      syncActionIfEnabled: vi.fn()
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

    expect(addCallbacksSpy).toHaveBeenCalledOnce();
    expect(addCallbacksSpy).toHaveBeenCalledWith({
      saveFileSystemOnInGameSave: true
    });
  });
});
