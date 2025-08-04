import { act } from 'react';
import * as toast from 'react-hot-toast';
import { describe, expect, it, vi } from 'vitest';

import { useAddCallbacks } from './use-add-callbacks.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorSettingsLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { CoreCallbackOptions } from './use-add-callbacks.tsx';
import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

type Expected = {
  saveDataUpdatedCallback: (() => void) | null;
  autoSaveStateLoadedCallback: (() => void) | null;
  autoSaveStateCapturedCallback: (() => void) | null;
};

type TestCase = [label: string, input: CoreCallbackOptions, expected: Expected];

const addCallbacksTestCases: TestCase[] = [
  [
    'only saveFileSystemOnInGameSave enabled',
    {
      saveFileSystemOnInGameSave: true,
      fileSystemNotificationsEnabled: false,
      autoSaveStateLoadNotificationEnabled: false,
      autoSaveStateCaptureNotificationEnabled: false
    },
    {
      saveDataUpdatedCallback: expect.anything(),
      autoSaveStateLoadedCallback: null,
      autoSaveStateCapturedCallback: null
    }
  ],
  [
    'only fileSystemNotificationsEnabled enabled',
    {
      saveFileSystemOnInGameSave: false,
      fileSystemNotificationsEnabled: true,
      autoSaveStateLoadNotificationEnabled: false,
      autoSaveStateCaptureNotificationEnabled: false
    },
    {
      saveDataUpdatedCallback: null,
      autoSaveStateLoadedCallback: null,
      autoSaveStateCapturedCallback: null
    }
  ],
  [
    'only autoSaveStateLoadNotificationEnabled enabled',
    {
      saveFileSystemOnInGameSave: false,
      fileSystemNotificationsEnabled: false,
      autoSaveStateLoadNotificationEnabled: true,
      autoSaveStateCaptureNotificationEnabled: false
    },
    {
      saveDataUpdatedCallback: null,
      autoSaveStateLoadedCallback: expect.anything(),
      autoSaveStateCapturedCallback: null
    }
  ],
  [
    'only autoSaveStateCaptureNotificationEnabled enabled',
    {
      saveFileSystemOnInGameSave: false,
      fileSystemNotificationsEnabled: false,
      autoSaveStateLoadNotificationEnabled: false,
      autoSaveStateCaptureNotificationEnabled: true
    },
    {
      saveDataUpdatedCallback: null,
      autoSaveStateLoadedCallback: null,
      autoSaveStateCapturedCallback: expect.anything()
    }
  ],
  [
    'all flags disabled (clears all callbacks)',
    {
      saveFileSystemOnInGameSave: false,
      fileSystemNotificationsEnabled: false,
      autoSaveStateLoadNotificationEnabled: false,
      autoSaveStateCaptureNotificationEnabled: false
    },
    {
      saveDataUpdatedCallback: null,
      autoSaveStateLoadedCallback: null,
      autoSaveStateCapturedCallback: null
    }
  ]
];

describe('useAddCallbacks hook', () => {
  describe('addCallbacks', () => {
    it.each(addCallbacksTestCases)(
      'emulator callbacks: %s',
      (_, input, expected) => {
        const emulatorAddCoreCallbacksSpy: (f: CoreCallbackOptions) => void =
          vi.fn();

        vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
          setCanvas: vi.fn(),
          canvas: null,
          emulator: {
            addCoreCallbacks: emulatorAddCoreCallbacksSpy,
            getCurrentAutoSaveStatePath: () => null
          } as GBAEmulator
        }));

        const { result } = renderHookWithContext(() => useAddCallbacks());

        act(() => result.current.addCallbacks(input));

        expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledOnce();
        expect(emulatorAddCoreCallbacksSpy).toHaveBeenCalledWith(expected);
      }
    );
  });

  describe('syncActionIfEnabled', () => {
    it('should sync files and toast when options are enabled', async () => {
      const emulatorFSSyncSpy: () => void = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          fsSync: emulatorFSSyncSpy,
          getCurrentAutoSaveStatePath: () => null
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
          fsSync: emulatorFSSyncSpy,
          getCurrentAutoSaveStatePath: () => null
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
          fsSync: emulatorFSSyncSpy,
          getCurrentAutoSaveStatePath: () => null
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
