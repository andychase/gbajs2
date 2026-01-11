import { waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  uint8ArrayToBase64,
  useUnloadEmulator
} from './use-unload-emulator.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorAutoSaveUnloadLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('useUnloadEmulator hook', () => {
  it('does nothing if isRunning is false', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { useRunningContext: originalRunning } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      ...originalRunning(),
      isRunning: false
    }));

    renderHookWithContext(() => {
      useUnloadEmulator();
    });

    fireEvent(window, new Event('pagehide'));

    await waitFor(() => {
      expect(setItemSpy).not.toHaveBeenCalledWith(
        emulatorAutoSaveUnloadLocalStorageKey,
        expect.anything()
      );
    });
  });

  it('persists the auto save state if emulator is running', async () => {
    const forceAutoSaveStateSpy = vi.fn(() => true);
    const getAutoSaveStateSpy = vi.fn(() => ({
      autoSaveStateName: 'autosave.ss0',
      data: new Uint8Array([116, 101, 115, 116]) // "test"
    }));

    const {
      useEmulatorContext: originalEmulator,
      useRunningContext: originalRunning
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        forceAutoSaveState: forceAutoSaveStateSpy as () => boolean,
        getAutoSaveState: getAutoSaveStateSpy as () => {
          autoSaveStateName: string;
          data: Uint8Array;
        }
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      ...originalRunning(),
      isRunning: true
    }));

    renderHookWithContext(() => {
      useUnloadEmulator();
    });

    fireEvent(window, new Event('pagehide'));

    await waitFor(() => {
      expect(forceAutoSaveStateSpy).toHaveBeenCalledOnce();
    });

    expect(getAutoSaveStateSpy).toHaveBeenCalledOnce();

    const stored = localStorage.getItem(emulatorAutoSaveUnloadLocalStorageKey);
    expect(stored).not.toBeNull();

    const parsed = stored && JSON.parse(stored);
    expect(parsed).toMatchObject({
      filename: 'autosave.ss0',
      data: uint8ArrayToBase64(new Uint8Array([116, 101, 115, 116])), // "test"
      event: 'pagehide',
      timestamp: expect.any(String)
    });
  });
});
