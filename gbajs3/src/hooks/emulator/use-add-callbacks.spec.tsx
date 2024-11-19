import { act } from 'react';
import * as toast from 'react-hot-toast';
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

  describe('syncActionIfEnabled', () => {
    it('should sync files and toast when options are enabled', async () => {
      const emulatorFSSyncSpy: () => void = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          fsSync: emulatorFSSyncSpy
        } as GBAEmulator
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      localStorage.setItem(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":true,"notificationsEnabled":true}'
      );

      const { result } = renderHookWithContext(() => useAddCallbacks());

      await act(() => result.current.syncActionIfEnabled());

      expect(emulatorFSSyncSpy).toHaveBeenCalledOnce();
      expect(toastSuccessSpy).toHaveBeenCalledOnce();
      expect(toastSuccessSpy).toHaveBeenCalledWith('Saved File System');
    });

    it('should only sync files', async () => {
      const emulatorFSSyncSpy: () => void = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          fsSync: emulatorFSSyncSpy
        } as GBAEmulator
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      localStorage.setItem(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":true,"notificationsEnabled":false}'
      );

      const { result } = renderHookWithContext(() => useAddCallbacks());

      await act(() => result.current.syncActionIfEnabled());

      expect(emulatorFSSyncSpy).toHaveBeenCalledOnce();
      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });

    it('should noop if file system save is disabled', async () => {
      const emulatorFSSyncSpy: () => void = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          fsSync: emulatorFSSyncSpy
        } as GBAEmulator
      }));

      const toastSuccessSpy = vi.spyOn(toast.default, 'success');

      localStorage.setItem(
        emulatorCoreCallbacksLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":false,"notificationsEnabled":true}'
      );

      const { result } = renderHookWithContext(() => useAddCallbacks());

      await act(() => result.current.syncActionIfEnabled());

      expect(emulatorFSSyncSpy).not.toHaveBeenCalled();
      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
