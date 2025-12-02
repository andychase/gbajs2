import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useQuickReload } from './use-quick-reload.tsx';
import * as runGameHooks from './use-run-game.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import { emulatorGameNameLocalStorageKey } from '../../context/emulator/consts.ts';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('useQuickReload hook', () => {
  describe('quickReload', () => {
    it('quick reloads using the emulator if running', () => {
      const emulatorQuickReloadSpy: () => void = vi.fn();
      const setIsRunningSpy = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => undefined,
          quickReload: emulatorQuickReloadSpy,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: true,
        setIsRunning: setIsRunningSpy
      }));

      const {
        result: {
          current: { quickReload }
        }
      } = renderHookWithContext(() => useQuickReload());

      act(() => {
        quickReload();
      });

      expect(emulatorQuickReloadSpy).toHaveBeenCalledOnce();
      expect(setIsRunningSpy).not.toHaveBeenCalled();
    });

    it('quick reloads last game name from the emulator', () => {
      const emulatorQuickReloadSpy: () => void = vi.fn();
      const runGameSpy = vi.fn(() => true);
      const setIsRunningSpy = vi.fn();

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => 'some_rom.gba',
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: false,
        setIsRunning: setIsRunningSpy
      }));

      vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

      const {
        result: {
          current: { quickReload }
        }
      } = renderHookWithContext(() => useQuickReload());

      act(() => {
        quickReload();
      });

      expect(runGameSpy).toHaveBeenCalledOnce();
      expect(runGameSpy).toHaveBeenCalledWith('some_rom.gba');
      expect(emulatorQuickReloadSpy).not.toHaveBeenCalled();

      expect(setIsRunningSpy).toHaveBeenCalledOnce();
      expect(setIsRunningSpy).toHaveBeenCalledWith(true);
    });

    it('quick reloads last stored game name from localStorage', () => {
      const emulatorQuickReloadSpy: () => void = vi.fn();
      const runGameSpy = vi.fn(() => true);
      const setIsRunningSpy = vi.fn();

      localStorage.setItem(emulatorGameNameLocalStorageKey, '"some_rom_2.gba"');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => undefined,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: false,
        setIsRunning: setIsRunningSpy
      }));

      vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

      const {
        result: {
          current: { quickReload }
        }
      } = renderHookWithContext(() => useQuickReload());

      act(() => {
        quickReload();
      });

      expect(runGameSpy).toHaveBeenCalledOnce();
      expect(runGameSpy).toHaveBeenCalledWith('some_rom_2.gba');
      expect(emulatorQuickReloadSpy).not.toHaveBeenCalled();

      expect(setIsRunningSpy).toHaveBeenCalledOnce();
      expect(setIsRunningSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('isQuickReloadAvailable', () => {
    it('is available when running', () => {
      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => 'some_rom.gba',
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: true,
        setIsRunning: vi.fn()
      }));

      const {
        result: {
          current: { isQuickReloadAvailable }
        }
      } = renderHookWithContext(() => useQuickReload());

      expect(isQuickReloadAvailable).toBe(true);
    });

    it('is available if there is a current game name', () => {
      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => 'some_rom.gba',
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
        isRunning: true,
        setIsRunning: vi.fn()
      }));

      const {
        result: {
          current: { isQuickReloadAvailable }
        }
      } = renderHookWithContext(() => useQuickReload());

      expect(isQuickReloadAvailable).toBe(true);
    });

    it('is available if there is a stored game name', () => {
      localStorage.setItem(emulatorGameNameLocalStorageKey, '"some_rom_2.gba"');

      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => undefined,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      const {
        result: {
          current: { isQuickReloadAvailable }
        }
      } = renderHookWithContext(() => useQuickReload());

      expect(isQuickReloadAvailable).toBe(true);
    });

    it('is not available if there is no current or stored game name', () => {
      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        setCanvas: vi.fn(),
        canvas: null,
        emulator: {
          getCurrentGameName: () => undefined,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      }));

      const {
        result: {
          current: { isQuickReloadAvailable }
        }
      } = renderHookWithContext(() => useQuickReload());

      expect(isQuickReloadAvailable).toBe(false);
    });
  });
});
