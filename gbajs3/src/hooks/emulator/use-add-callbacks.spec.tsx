import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useAddCallbacks } from './use-add-callbacks.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorCoreCallbacksLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { CoreCallbackOptions } from './use-add-callbacks.tsx';
import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('useAddCallbacks hook', () => {
  describe('addCallbacks', () => {
    it('adds saveDataUpdatedCallback to emulator', () => {
      const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
        vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          addCoreCallbacks: emulatorAddCoreCallbacksSpy
        } as GBAEmulator
      }));

      const { result } = renderHookWithContext(() => useAddCallbacks());

      act(() => {
        result.current.addCallbacks({ saveFileSystemOnInGameSave: true });
      });

      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledOnce();
      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledWith({
        saveDataUpdatedCallback: expect.anything()
      });
    });

    it('clears saveDataUpdatedCallback', () => {
      const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
        vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          addCoreCallbacks: emulatorAddCoreCallbacksSpy
        } as GBAEmulator
      }));

      const { result } = renderHookWithContext(() => useAddCallbacks());

      act(() => {
        result.current.addCallbacks({ saveFileSystemOnInGameSave: false });
      });

      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledOnce();
      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledWith({
        saveDataUpdatedCallback: null
      });
    });
  });

  describe('addCallbacksAndSaveSettings', () => {
    it('persists args to storage and adds callbacks if emulator is running', () => {
      const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
        vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          addCoreCallbacks: emulatorAddCoreCallbacksSpy
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: true,
        setIsRunning: vi.fn()
      }));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { result } = renderHookWithContext(() => useAddCallbacks());

      act(() => {
        result.current.addCallbacksAndSaveSettings({
          saveFileSystemOnInGameSave: true,
          notificationsEnabled: true
        });
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnInGameSave":true,"notificationsEnabled":true}'
      );

      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledOnce();
      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledWith({
        saveDataUpdatedCallback: expect.anything()
      });
    });

    it('persists args to storage and clears callbacks if emulator is running', () => {
      const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
        vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          addCoreCallbacks: emulatorAddCoreCallbacksSpy
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: true,
        setIsRunning: vi.fn()
      }));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { result } = renderHookWithContext(() => useAddCallbacks());

      act(() => {
        result.current.addCallbacksAndSaveSettings({
          saveFileSystemOnInGameSave: false
        });
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnInGameSave":false}'
      );

      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledOnce();
      expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledWith({
        saveDataUpdatedCallback: null
      });
    });

    it('persists args to storage and does not call emulator if not running', () => {
      const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
        vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          addCoreCallbacks: emulatorAddCoreCallbacksSpy
        } as GBAEmulator
      }));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { result } = renderHookWithContext(() => useAddCallbacks());

      act(() => {
        result.current.addCallbacksAndSaveSettings({
          saveFileSystemOnInGameSave: true,
          notificationsEnabled: true
        });
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnInGameSave":true,"notificationsEnabled":true}'
      );

      expect(emulatorAddCoreCallbacksSpy).not.toHaveBeenCalled();
    });
  });
});
