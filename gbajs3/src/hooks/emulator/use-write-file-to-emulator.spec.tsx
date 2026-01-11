import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import * as contextHooks from '../context.tsx';
import { useWriteFileToEmulator } from './use-write-file-to-emulator.tsx';
import {
  fileTypes,
  type FileTypes,
  type GBAEmulator
} from '../../emulator/mgba/mgba-emulator.tsx';

import type { filePaths } from '@thenick775/mgba-wasm';

describe('useWriteFileToEmulator hook', () => {
  const makeFile = (name: string) =>
    new File(['some file contents'], name, {
      type: 'application/octet-stream'
    });

  it.each([
    { override: 'rom' as const, method: 'uploadRom' },
    { override: 'save' as const, method: 'uploadSaveOrSaveState' },
    { override: 'cheat' as const, method: 'uploadCheats' },
    { override: 'patch' as const, method: 'uploadPatch' },
    { override: 'screenshot' as const, method: 'uploadScreenshot' }
  ])(
    'calls $method when override is "$override"',
    async ({ override, method }) => {
      const uploadRomSpy = vi.fn((_: File, cb?: () => void) => cb?.());
      const uploadSaveOrSaveStateSpy = vi.fn((_: File, cb?: () => void) =>
        cb?.()
      );
      const uploadCheatsSpy = vi.fn((_: File, cb?: () => void) => cb?.());
      const uploadPatchSpy = vi.fn((_: File, cb?: () => void) => cb?.());
      const uploadScreenshotSpy = vi.fn((_: File, cb?: () => void) => cb?.());

      const emulator: Partial<GBAEmulator> = {
        isFileExtensionOfType: () => false,
        uploadRom: uploadRomSpy,
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy,
        uploadCheats: uploadCheatsSpy,
        uploadPatch: uploadPatchSpy,
        uploadScreenshot: uploadScreenshotSpy
      };

      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../context.tsx');
      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: emulator as GBAEmulator
      }));

      const { result } = renderHookWithContext(() => useWriteFileToEmulator());

      const file = makeFile('anything.anything');
      await act(async () => result.current(file, override));

      const spy = {
        uploadRom: uploadRomSpy,
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy,
        uploadCheats: uploadCheatsSpy,
        uploadPatch: uploadPatchSpy,
        uploadScreenshot: uploadScreenshotSpy
      }[method];

      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(file, expect.any(Function));
    }
  );

  it('uploads AUTOSAVE (override) to autosave path as Uint8Array', async () => {
    const uploadAutoSaveStateSpy = vi.fn(() => Promise.resolve());

    const emulator: Partial<GBAEmulator> = {
      filePaths: () => ({ autosave: '/data/autosave' } as filePaths),
      isFileExtensionOfType: vi.fn(() => false),
      uploadAutoSaveState: uploadAutoSaveStateSpy
    };

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../context.tsx');
    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: emulator as GBAEmulator
    }));

    const { result } = renderHookWithContext(() => useWriteFileToEmulator());

    const file = makeFile('state.ss');

    await act(async () => result.current(file, 'autosave'));

    expect(uploadAutoSaveStateSpy).toHaveBeenCalledOnce();

    expect(uploadAutoSaveStateSpy).toHaveBeenCalledWith(
      '/data/autosave/state.ss',
      expect.any(Uint8Array)
    );
  });

  it.each([
    // roms
    { name: 'game.gba', method: 'uploadRom' },
    { name: 'GAME.GBA', method: 'uploadRom' },
    // saves
    { name: 'keep.sav', method: 'uploadSaveOrSaveState' },
    { name: 'KEEP.SAV', method: 'uploadSaveOrSaveState' },
    // autosaves
    {
      name: 'rom1_auto.ss',

      method: 'uploadAutoSaveState'
    },
    {
      name: 'ROM1_AUTO.SS',

      method: 'uploadAutoSaveState'
    },
    // cheats
    { name: 'codes.cheats', method: 'uploadCheats' },
    { name: 'CODES.CHEATS', method: 'uploadCheats' },
    // patches
    { name: 'patch.ips', method: 'uploadPatch' },
    { name: 'patch.UPS', method: 'uploadPatch' },
    // screenshots
    { name: 'shot.png', method: 'uploadScreenshot' },
    { name: 'SHOT.PNG', method: 'uploadScreenshot' }
  ])(
    'detects type from extension when no override: $name -> $detectType',
    async ({ name, method }) => {
      const uploadRomSpy = vi.fn((_f: File, cb?: () => void) => cb?.());
      const uploadSaveOrSaveStateSpy = vi.fn((_f: File, cb?: () => void) =>
        cb?.()
      );
      const uploadCheatsSpy = vi.fn((_f: File, cb?: () => void) => cb?.());
      const uploadPatchSpy = vi.fn((_f: File, cb?: () => void) => cb?.());
      const uploadScreenshotSpy = vi.fn((_f: File, cb?: () => void) => cb?.());
      const uploadAutoSaveStateSpy = vi.fn(async () => {
        /* empty */
      });
      const isFileExtensionOfTypeSpy = vi.fn(
        (fileName: string, type: keyof FileTypes) => {
          const fileExtension = `.${fileName.split('.').pop()}`;

          return fileTypes[type].some((e) =>
            typeof e === 'string'
              ? e === fileExtension
              : !!e.regex.exec(fileName)
          );
        }
      );

      const emulator: Partial<GBAEmulator> = {
        filePaths: () => ({
          root: '/data',
          saveStatePath: '/data/states',
          cheatsPath: '/data/cheats',
          gamePath: '/data/games',
          savePath: '/data/saves',
          screenshotsPath: '/data/screenshots',
          patchPath: '/data/patches',
          autosave: '/autosave'
        }),
        isFileExtensionOfType: isFileExtensionOfTypeSpy,
        uploadRom: uploadRomSpy,
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy,
        uploadCheats: uploadCheatsSpy,
        uploadPatch: uploadPatchSpy,
        uploadScreenshot: uploadScreenshotSpy,
        uploadAutoSaveState: uploadAutoSaveStateSpy
      };

      const { useEmulatorContext: original } = await vi.importActual<
        typeof contextHooks
      >('../context.tsx');
      vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
        ...original(),
        emulator: emulator as GBAEmulator
      }));

      const { result } = renderHookWithContext(() => useWriteFileToEmulator());
      const file = makeFile(name);

      await act(async () => result.current(file));

      const spy = {
        uploadRom: uploadRomSpy,
        uploadSaveOrSaveState: uploadSaveOrSaveStateSpy,
        uploadCheats: uploadCheatsSpy,
        uploadPatch: uploadPatchSpy,
        uploadScreenshot: uploadScreenshotSpy,
        uploadAutoSaveState: uploadAutoSaveStateSpy
      }[method];

      expect(spy).toHaveBeenCalledOnce();

      if (method === 'uploadAutoSaveState') {
        expect(spy).toHaveBeenCalledWith(
          `/autosave/${name}`,
          expect.any(Uint8Array)
        );
      } else {
        expect(spy).toHaveBeenCalledWith(file, expect.any(Function));
      }
    }
  );

  it('lowercases name before detection', async () => {
    const isFileExtensionOfType = vi.fn(
      (n: string, t: string) => t === 'save' && n === 'save1.sav'
    );

    const uploadSaveOrSaveState = vi.fn((_f: File, cb?: () => void) => cb?.());

    const emulator: Partial<GBAEmulator> = {
      filePaths: () => ({ autosave: '/data/autosave' } as filePaths),
      isFileExtensionOfType,
      uploadSaveOrSaveState
    };

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../context.tsx');
    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: emulator as GBAEmulator
    }));

    const { result } = renderHookWithContext(() => useWriteFileToEmulator());
    const file = makeFile('SAVE1.SAV');

    await act(async () => result.current(file));

    expect(isFileExtensionOfType).toHaveBeenCalledWith('save1.sav', 'rom');
    expect(isFileExtensionOfType).toHaveBeenCalledWith('save1.sav', 'autosave');
    expect(isFileExtensionOfType).toHaveBeenCalledWith('save1.sav', 'save');

    expect(uploadSaveOrSaveState).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no override and no type matches', async () => {
    const emulator: Partial<GBAEmulator> = {
      isFileExtensionOfType: vi.fn(() => false),
      filePaths: () => ({ autosave: '/data/autosave' } as filePaths),
      uploadRom: vi.fn(),
      uploadSaveOrSaveState: vi.fn(),
      uploadCheats: vi.fn(),
      uploadPatch: vi.fn(),
      uploadScreenshot: vi.fn(),
      uploadAutoSaveState: vi.fn()
    };

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../context.tsx');
    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: emulator as GBAEmulator
    }));

    const { result } = renderHookWithContext(() => useWriteFileToEmulator());
    const file = makeFile('unknown.unknown');

    await act(async () => result.current(file));

    expect(emulator.uploadRom).not.toHaveBeenCalled();
    expect(emulator.uploadSaveOrSaveState).not.toHaveBeenCalled();
    expect(emulator.uploadCheats).not.toHaveBeenCalled();
    expect(emulator.uploadPatch).not.toHaveBeenCalled();
    expect(emulator.uploadScreenshot).not.toHaveBeenCalled();
    expect(emulator.uploadAutoSaveState).not.toHaveBeenCalled();
  });
});
