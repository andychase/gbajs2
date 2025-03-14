import { act } from 'react';
import * as toast from 'react-hot-toast';
import { describe, expect, it, vi } from 'vitest';

import { useAddCallbacks } from './use-add-callbacks.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorSettingsLocalStorageKey } from '../../context/emulator/consts.ts';
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
        emulatorSettingsLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":true,"fileSystemNotificationsEnabled":true}'
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
        emulatorSettingsLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":true,"fileSystemNotificationsEnabled":false}'
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
        emulatorSettingsLocalStorageKey,
        '{"saveFileSystemOnCreateUpdateDelete":false,"fileSystemNotificationsEnabled":true}'
      );

      const { result } = renderHookWithContext(() => useAddCallbacks());

      await act(() => result.current.syncActionIfEnabled());

      expect(emulatorFSSyncSpy).not.toHaveBeenCalled();
      expect(toastSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
