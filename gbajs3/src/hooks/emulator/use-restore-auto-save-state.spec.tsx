import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRestoreAutoSaveStateData } from './use-restore-auto-save-state.tsx';
import { emulatorAutoSaveUnloadLocalStorageKey } from '../../context/emulator/consts.ts';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator';

describe('useRestoreAutoSaveStateData hook', () => {
  it('restores save state and clears localStorage', async () => {
    const uploadAutoSaveStateSpy = vi.fn().mockResolvedValue(undefined);
    const emu = {
      uploadAutoSaveState: uploadAutoSaveStateSpy as (
        autoSaveStateName: string,
        data: Uint8Array
      ) => Promise<void>
    } as GBAEmulator;

    localStorage.setItem(
      emulatorAutoSaveUnloadLocalStorageKey,
      JSON.stringify({
        filename: 'autosave.ss0',
        data: btoa('test binary blob'),
        timestamp: new Date().toISOString(),
        event: 'unload'
      })
    );

    renderHook(() => {
      useRestoreAutoSaveStateData(emu);
    });

    await waitFor(() => {
      expect(uploadAutoSaveStateSpy).toHaveBeenCalledWith(
        'autosave.ss0',
        new Uint8Array([
          116, 101, 115, 116, 32, 98, 105, 110, 97, 114, 121, 32, 98, 108, 111,
          98
        ]) // "test binary blob"
      );
    });
    expect(uploadAutoSaveStateSpy).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(localStorage.getItem(emulatorAutoSaveUnloadLocalStorageKey)).toBe(
        null
      );
    });
  });

  it('does nothing if emulator is null', async () => {
    localStorage.setItem(
      emulatorAutoSaveUnloadLocalStorageKey,
      JSON.stringify({
        filename: 'autosave.ss0',
        data: btoa('test'),
        timestamp: new Date().toISOString(),
        event: 'unload'
      })
    );

    renderHook(() => {
      useRestoreAutoSaveStateData(null);
    });

    await waitFor(() => {
      expect(
        localStorage.getItem(emulatorAutoSaveUnloadLocalStorageKey)
      ).not.toBe(null);
    });
  });

  it('does nothing if localStorage is empty', async () => {
    const uploadAutoSaveStateSpy = vi.fn();
    const emu = {
      uploadAutoSaveState: uploadAutoSaveStateSpy as (
        autoSaveStateName: string,
        data: Uint8Array
      ) => Promise<void>
    } as GBAEmulator;

    renderHook(() => {
      useRestoreAutoSaveStateData(emu);
    });

    await waitFor(() => {
      expect(uploadAutoSaveStateSpy).not.toHaveBeenCalled();
    });
  });

  it('does nothing if filename or data are missing', async () => {
    const uploadAutoSaveStateSpy = vi.fn();
    const emu = {
      uploadAutoSaveState: uploadAutoSaveStateSpy as (
        autoSaveStateName: string,
        data: Uint8Array
      ) => Promise<void>
    } as GBAEmulator;

    localStorage.setItem(
      emulatorAutoSaveUnloadLocalStorageKey,
      JSON.stringify({
        filename: '',
        data: '',
        timestamp: new Date().toISOString(),
        event: 'unload'
      })
    );

    renderHook(() => {
      useRestoreAutoSaveStateData(emu);
    });

    await waitFor(() => {
      expect(uploadAutoSaveStateSpy).not.toHaveBeenCalled();
    });
  });
});
