import { describe, it, expect, vi } from 'vitest';

import {
  mGBAEmulator,
  KEY_LOCATION_STANDARD,
  KEY_LOCATION_NUMPAD
} from './mgba-emulator.tsx';

import type { ParsedCheats } from './mgba-emulator.tsx';
import type { mGBAEmulator as mGBAEmulatorTypeDef } from '@thenick775/mgba-wasm';

describe('mGBAEmulator - Full Functionality Test Suite', () => {
  const mockMGBA: Partial<mGBAEmulatorTypeDef> = {
    filePaths: vi.fn(() => ({
      root: '/data',
      saveStatePath: '/data/states',
      cheatsPath: '/data/cheats',
      gamePath: '/data/games',
      savePath: '/data/saves',
      screenshotsPath: '/data/screenshots',
      patchPath: '/data/patches'
    })),
    FS: {
      readdir: vi.fn(() => ['file1.sav', 'file2.sav']),
      readFile: vi.fn((path: string) => {
        if (path.includes('.cheats')) return new Uint8Array([1, 2, 3]);
        return new Uint8Array([4, 5, 6]);
      }),
      analyzePath: vi.fn(() => ({ exists: true })),
      unlink: vi.fn()
    } as unknown as typeof FS,
    SDL2: {
      audioContext: {
        state: 'suspended',
        resume: vi.fn().mockResolvedValue(undefined),
        suspend: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      }
    } as unknown as mGBAEmulatorTypeDef['SDL2'],
    gameName: '/data/games/testGame.gba',
    saveName: '/data/saves/testGame.sav',
    getSave: vi.fn(() => new Uint8Array([4, 5, 6])),
    getFastForwardMultiplier: vi.fn(() => 2),
    resumeGame: vi.fn(),
    toggleInput: vi.fn(),
    bindKey: vi.fn()
  };

  const createEmulator = (overrides: Partial<mGBAEmulatorTypeDef> = {}) =>
    mGBAEmulator({ ...mockMGBA, ...overrides } as mGBAEmulatorTypeDef);

  it('should return the default key bindings', () => {
    const emulator = createEmulator();
    expect(emulator.defaultKeyBindings()).toEqual([
      { gbaInput: 'A', key: 'X', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'B', key: 'Z', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'L', key: 'A', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'R', key: 'S', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Start', key: 'Enter', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Select', key: 'Backspace', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Up', key: 'ArrowUp', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Down', key: 'ArrowDown', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Left', key: 'ArrowLeft', location: KEY_LOCATION_STANDARD },
      { gbaInput: 'Right', key: 'ArrowRight', location: KEY_LOCATION_STANDARD }
    ]);
  });

  it('should return the default sample rates', () => {
    const emulator = createEmulator();
    expect(emulator.defaultAudioSampleRates()).toEqual([
      22050, 32000, 44100, 48000
    ]);
  });

  it('should return the default buffer sizes', () => {
    const emulator = createEmulator();
    expect(emulator.defaultAudioBufferSizes()).toEqual([
      256, 512, 768, 1024, 1536, 2048, 3072, 4096
    ]);
  });

  it('should parse a cheats string in libretro format', () => {
    const emulator = createEmulator();
    const cheatsStr = `cheats = 2
cheat0_desc = "Infinite Lives"
cheat0_enable = true
cheat0_code = "ABC123"
cheat1_desc = "All Weapons"
cheat1_enable = false
cheat1_code = "XYZ789"`;

    expect(emulator.parseCheatsString(cheatsStr)).toEqual([
      { desc: 'Infinite Lives', enable: true, code: 'ABC123' },
      { desc: 'All Weapons', enable: false, code: 'XYZ789' }
    ]);
  });

  it('should parse a cheats string with spaces and empty lines', () => {
    const emulator = createEmulator();
    const cheatsStr = `cheats = 2
cheat0_desc = "Infinite Lives" 
cheat0_enable = true 
cheat0_code = "ABC123" 

cheat1_desc = "All Weapons"
cheat1_enable = false
cheat1_code = "XYZ789"`;

    expect(emulator.parseCheatsString(cheatsStr)).toEqual([
      { desc: 'Infinite Lives', enable: true, code: 'ABC123' },
      { desc: 'All Weapons', enable: false, code: 'XYZ789' }
    ]);
  });

  it('should return empty cheats list if header line does not match', () => {
    const emulator = createEmulator();
    const cheatsStr = `cheat0_desc = "Infinite Lives"
cheat0_enable = true
cheat0_code = "ABC123"
cheat1_desc = "All Weapons"
cheat1_enable = false
cheat1_code = "XYZ789"`;

    expect(emulator.parseCheatsString(cheatsStr)).toEqual([]);
  });

  it('should generate a valid cheats file from a list of cheats', async () => {
    const emulator = createEmulator();
    const cheatsList = [
      { desc: 'Infinite Lives', enable: true, code: 'ABC123' },
      { desc: 'All Weapons', enable: false, code: 'XYZ789' }
    ];

    const cheatsFile = emulator.parsedCheatsToFile(cheatsList);

    expect(cheatsFile).toBeInstanceOf(File);
    expect(cheatsFile?.name).toBe('testGame.cheats');

    const expectedContent =
      `cheats = 2\n\n` +
      `cheat0_desc = "Infinite Lives"\ncheat0_enable = true\ncheat0_code = "ABC123"\n\n` +
      `cheat1_desc = "All Weapons"\ncheat1_enable = false\ncheat1_code = "XYZ789"\n`;

    const content = await cheatsFile?.text();
    expect(content).toBe(expectedContent);
  });

  it('should return null if current game path is invalid', async () => {
    const emulator = createEmulator({ gameName: '/data/games/' });
    const cheatsList = [
      { desc: 'Infinite Lives', enable: true, code: 'ABC123' },
      { desc: 'All Weapons', enable: false, code: 'XYZ789' }
    ];

    const cheatsFile = emulator.parsedCheatsToFile(cheatsList);

    expect(cheatsFile).toBeNull();
  });

  it('should generate only a header if cheats list is empty', async () => {
    const emulator = createEmulator();
    const cheatsList: ParsedCheats[] = [];

    const cheatsFile = emulator.parsedCheatsToFile(cheatsList);

    expect(cheatsFile).toBeInstanceOf(File);
    expect(cheatsFile?.name).toBe('testGame.cheats');

    const expectedContent = `cheats = 0\n\n`;

    const content = await cheatsFile?.text();
    expect(content).toBe(expectedContent);
  });

  it('should retrieve the current cheats file', () => {
    const emulator = createEmulator();
    expect(emulator.getCurrentCheatsFile()).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockMGBA.FS?.readFile).toHaveBeenCalledWith(
      '/data/cheats/testGame.cheats'
    );
  });

  it('should return an empty Uint8Array when cheats file does not exist', () => {
    const emulator = createEmulator({
      FS: {
        analyzePath: vi.fn(() => ({ exists: false }))
      } as unknown as typeof FS
    });
    expect(emulator.getCurrentCheatsFile()).toEqual(new Uint8Array());
  });

  it('should enable keyboard input', () => {
    const emulator = createEmulator();
    emulator.enableKeyboardInput();
    expect(mockMGBA.toggleInput).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('should disable keyboard input', () => {
    const emulator = createEmulator();
    emulator.disableKeyboardInput();
    expect(mockMGBA.toggleInput).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('should properly remap key bindings', () => {
    const emulator = createEmulator();
    emulator.remapKeyBindings([{ gbaInput: 'A', key: 'X', location: 0 }]);
    expect(mockMGBA.bindKey).toHaveBeenCalledWith('X', 'A');
  });

  it('should handle key remapping edge cases', () => {
    const emulator = createEmulator();
    emulator.remapKeyBindings([
      { gbaInput: 'Start', key: 'Enter', location: 0 },
      { gbaInput: 'Up', key: 'ArrowUp', location: 0 },
      { gbaInput: '5', key: '5', location: KEY_LOCATION_NUMPAD }
    ]);

    expect(mockMGBA.bindKey).toHaveBeenCalledTimes(3);
    expect(mockMGBA.bindKey).toHaveBeenCalledWith('Return', 'Start');
    expect(mockMGBA.bindKey).toHaveBeenCalledWith('Up', 'Up');
    expect(mockMGBA.bindKey).toHaveBeenCalledWith('Keypad 5', '5');
  });

  it('should list all save states', () => {
    const emulator = createEmulator();
    expect(emulator.listSaveStates()).toEqual(['file1.sav', 'file2.sav']);
  });

  it('should delete a save state', () => {
    const emulator = createEmulator();
    emulator.deleteSaveState(3);
    expect(mockMGBA.FS?.unlink).toHaveBeenCalledWith(
      '/data/states/testGame.ss3'
    );
  });

  it('should list all files', () => {
    // const emulator = createEmulator();
    const emulator = createEmulator({
      FS: {
        readdir: vi.fn((path: string) => {
          if (path === '/data')
            return [
              '.',
              '..',
              'cheats',
              'games',
              'patches',
              'saves',
              'screenshots',
              'states'
            ];
          else if (path === '/data/saves') return ['file1.sav', 'file2.sav'];
          return [];
        }),
        lookupPath: vi.fn((path: string) => ({
          path,
          node: { mode: path.endsWith('.sav') ? 0o100000 : 0o40000 }
        })),
        isDir: vi.fn((mode: number) => (mode & 0o40000) === 0o40000)
      } as unknown as typeof FS
    });

    expect(emulator.listAllFiles()).toMatchObject({
      children: [
        {
          children: [],
          isDir: true,
          path: '/data/cheats'
        },
        {
          children: [],
          isDir: true,
          path: '/data/games'
        },
        {
          children: [],
          isDir: true,
          path: '/data/patches'
        },
        {
          children: [
            {
              children: [],
              isDir: false,
              path: '/data/saves/file1.sav'
            },
            {
              children: [],
              isDir: false,
              path: '/data/saves/file2.sav'
            }
          ],
          isDir: true,
          path: '/data/saves'
        },
        {
          children: [],
          isDir: true,
          path: '/data/screenshots'
        },
        {
          children: [],
          isDir: true,
          path: '/data/states'
        }
      ],
      isDir: true,
      path: '/data'
    });
  });

  it('should resume the emulator', async () => {
    const emulator = createEmulator();
    await emulator.resume();
    expect(mockMGBA.SDL2?.audioContext.resume).toHaveBeenCalled();
    expect(mockMGBA.resumeGame).toHaveBeenCalled();
  });

  it('should resume emulator and audio if audio context is suspended', async () => {
    const emulator = createEmulator({
      SDL2: {
        audioContext: {
          ...mockMGBA.SDL2?.audioContext,
          state: 'interrupted'
        }
      } as unknown as mGBAEmulatorTypeDef['SDL2']
    });
    await emulator.resume();
    expect(mockMGBA.SDL2?.audioContext.resume).toHaveBeenCalled();
    expect(mockMGBA.resumeGame).toHaveBeenCalled();
  });

  it('should determine if fast forward is enabled', () => {
    const emulator = createEmulator();
    expect(emulator.isFastForwardEnabled()).toBe(true);
  });

  it('should get the current ROM as a Uint8Array', () => {
    const emulator = createEmulator();
    expect(emulator.getCurrentRom()).toEqual(new Uint8Array([4, 5, 6]));
    expect(mockMGBA.FS?.readFile).toHaveBeenCalledOnce();
    expect(mockMGBA.FS?.readFile).toHaveBeenCalledWith(
      '/data/games/testGame.gba'
    );
  });

  it('should return null if there is no game loaded', () => {
    const emulator = createEmulator({ gameName: undefined });
    expect(emulator.getCurrentRom()).toBeNull();
  });

  it('should return the current game name', () => {
    const emulator = createEmulator();
    expect(emulator.getCurrentGameName()).toBe('testGame.gba');
  });

  it('should return the current save file as a Uint8Array', () => {
    const emulator = createEmulator();
    expect(emulator.getCurrentSave()).toEqual(new Uint8Array([4, 5, 6]));
    expect(mockMGBA.getSave).toHaveBeenCalled();
  });

  it('should return null if there is no save loaded', () => {
    const emulator = createEmulator({ saveName: undefined });
    expect(emulator.getCurrentSave()).toBeNull();
  });

  it('should return the current save name without extension', () => {
    const emulator = createEmulator();
    expect(emulator.getCurrentSaveName()).toBe('testGame.sav');
  });

  it('should retrieve an arbitrary file using getFile', () => {
    const emulator = createEmulator();
    const filePath = '/mockGame';
    expect(emulator.getFile(filePath)).toEqual(new Uint8Array([4, 5, 6]));
    expect(mockMGBA.FS?.readFile).toHaveBeenCalledWith(filePath);
  });

  it('should properly quit the emulator', () => {
    const quitMgbaMock = vi.fn();
    const emulator = createEmulator({ quitMgba: quitMgbaMock });
    emulator.quitEmulator();
    expect(quitMgbaMock).toHaveBeenCalled();
  });

  it('should get current cheats file name', () => {
    const emulator = createEmulator();
    const cheatsFileName = emulator.getCurrentCheatsFileName();
    expect(cheatsFileName).toEqual('testGame.cheats');
  });

  it('should get current save name', () => {
    const emulator = createEmulator();
    const saveName = emulator.getCurrentSaveName();
    expect(saveName).toEqual('testGame.sav');
  });
});
