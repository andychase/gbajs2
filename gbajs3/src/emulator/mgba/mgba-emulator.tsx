import type {
  coreCallbacks,
  coreSettings,
  filePaths,
  mGBAEmulator as mGBAEmulatorTypeDef
} from '@thenick775/mgba-wasm';

export type KeyBinding = {
  gbaInput: string; // represents the GBA input to be remapped
  key: string; // represents the key property of a browser KeyboardEvent
  location: number; // represents the location property of a browser KeyboardEvent
};

export type FileNode = {
  path: string;
  isDir: boolean;
  children?: FileNode[];
  nextNeighbor?: FileNode;
};

export type ParsedCheats = {
  desc: string;
  code: string;
  enable: boolean;
};

export type Extension = RegexValidator | string;

type RegexValidator = {
  regex: RegExp;
  displayText: string;
};

export type FileTypes = Record<
  'rom' | 'save' | 'autosave' | 'cheat' | 'patch' | 'screenshot',
  Extension[]
>;

export type GBAEmulator = {
  addCoreCallbacks: (coreCallbacks: coreCallbacks) => void;
  autoLoadCheats: () => boolean;
  createSaveState: (slot: number) => boolean;
  coreName: string;
  defaultKeyBindings: () => KeyBinding[];
  defaultAudioSampleRates: () => number[];
  defaultAudioBufferSizes: () => number[];
  defaultFileTypes: () => FileTypes;
  deleteFile: (path: string) => void;
  deleteSaveState: (slot: number) => void;
  disableKeyboardInput: () => void;
  enableKeyboardInput: () => void;
  filePaths: () => filePaths;
  fsSync: () => Promise<void>;
  getCurrentCheatsFile: () => Uint8Array;
  getCurrentCheatsFileName: () => string | undefined;
  getCurrentGameName: () => string | undefined;
  getCurrentRom: () => Uint8Array | null;
  getCurrentSave: () => Uint8Array | null;
  getCurrentSaveName: () => string | undefined;
  getFile: (path: string) => Uint8Array;
  getStat: (path: string) => FS.Stats;
  getCurrentAutoSaveStatePath: () => string | null;
  getVolume: () => number;
  isFastForwardEnabled: () => boolean;
  isSlowdownEnabled: () => boolean;
  isFileExtensionOfType: (
    fileName: string,
    type: keyof typeof fileTypes
  ) => boolean;
  listAllFiles: () => FileNode;
  listRoms: () => string[];
  listCurrentSaveStates: () => string[];
  getSaveState: (saveStateName: string) => Uint8Array;
  loadSaveState: (slot: number) => boolean;
  parseCheatsString: (cheatsStr: string) => ParsedCheats[];
  parsedCheatsToFile: (cheatsList: ParsedCheats[]) => File | null;
  pause: () => void;
  quickReload: () => void;
  quitEmulator: () => void;
  quitGame: () => void;
  remapKeyBindings: (keyBindings: KeyBinding[]) => void;
  resume: () => Promise<void>;
  run: (romPath: string, savePathOverride?: string) => boolean;
  screenshot: (fileName?: string) => boolean;
  setFastForwardMultiplier: (multiplier: number) => void;
  setVolume: (volumePercent: number) => void;
  simulateKeyDown: (keyId: string) => void;
  simulateKeyUp: (keyId: string) => void;
  uploadCheats: (file: File, callback?: () => void) => void;
  uploadPatch: (file: File, callback?: () => void) => void;
  uploadRom: (file: File, callback?: () => void) => void;
  uploadSaveOrSaveState: (file: File, callback?: () => void) => void;
  uploadScreenshot: (file: File, callback?: () => void) => void;
  toggleRewind: (enabled: boolean) => void;
  setCoreSettings: (coreSettings: coreSettings) => void;
  forceAutoSaveState: () => boolean;
  loadAutoSaveState: () => boolean;
  getAutoSaveState: () => {
    autoSaveStateName: string;
    data: Uint8Array;
  } | null;
  uploadAutoSaveState: (
    autoSaveStateName: string,
    data: Uint8Array
  ) => Promise<void>;
};

export const KEY_LOCATION_STANDARD = 0;
export const KEY_LOCATION_NUMPAD = 3;

export const fileTypes: FileTypes = {
  rom: ['.gba', '.gbc', '.gb', '.zip', '.7z'],
  patch: ['.ips', '.ups', '.bps'],
  autosave: [{ regex: /_auto\.ss$/, displayText: '_auto.ss' }],
  save: ['.sav', { regex: /\.ss[0-9]+/, displayText: '.ss' }],
  cheat: ['.cheats'],
  screenshot: ['.png']
};

const defaultSampleRates = [22050, 32000, 44100, 48000];
const defaultAudioBufferSizes = [256, 512, 768, 1024, 1536, 2048, 3072, 4096];
const defaultKeyBindings = [
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
];

const fileIgnorePaths = ['.', '..'];

const isFileExtensionOfType = (
  fileName: string,
  type: keyof typeof fileTypes
) => {
  const fileExtension = `.${fileName.split('.').pop()}`;

  return fileTypes[type].some((e) =>
    typeof e === 'string' ? e === fileExtension : !!e.regex.exec(fileName)
  );
};

const filterSaveStates =
  (baseSaveStateName?: string) => (saveStateName: string) =>
    !fileIgnorePaths.includes(saveStateName) &&
    baseSaveStateName &&
    saveStateName.startsWith(baseSaveStateName);

export const mGBAEmulator = (mGBA: mGBAEmulatorTypeDef): GBAEmulator => {
  const paths = mGBA.filePaths();

  const filepathToFileName = (path?: string, extension?: string) => {
    let fileName = path?.split('/').pop();
    if (extension) {
      const ext = '.' + fileName?.split('.').pop();
      fileName = fileName?.replace(ext, extension);
    }

    return fileName;
  };

  const listAllFiles = () => {
    const root: FileNode = {
      path: paths.root,
      isDir: true,
      children: [],
      nextNeighbor: {
        path: paths.autosave,
        isDir: true,
        children: []
      }
    };

    const recursiveRead = ({ path, children, nextNeighbor }: FileNode) => {
      if (nextNeighbor) recursiveRead(nextNeighbor);

      for (const name of mGBA.FS.readdir(path)) {
        if (fileIgnorePaths.includes(name)) continue;

        const currPath = `${path}/${name}`;
        const { mode } = mGBA.FS.lookupPath(currPath, {}).node;
        const fileNode = {
          path: currPath,
          isDir: mGBA.FS.isDir(mode),
          children: []
        };

        children?.push(fileNode);
        if (fileNode.isDir) recursiveRead(fileNode);
      }
    };

    recursiveRead(root);

    return root;
  };

  // NOTE: only libretro format supported at this time
  const parseCheatsString = (cheatsStr: string) => {
    const lines = cheatsStr.split('\n');
    const ignoreLines = [/^cheats = \d+$/, /^$/];

    if (!lines[0]?.match('^cheats = [0-9]+$')) return [];

    const assembledCheats: {
      [cheatNumber: string]:
        | {
            [cheatType: string]: string | boolean;
          }
        | undefined;
    } = {};
    const propertyMap: { [key: string]: keyof ParsedCheats } = {
      desc: 'desc',
      code: 'code',
      enable: 'enable'
    };

    for (const cheatLine of lines) {
      if (ignoreLines.some((regex) => regex.test(cheatLine))) continue;

      const match = cheatLine
        .trim()
        .match(/^cheat([0-9]+)_([a-zA-Z]+)\s*=\s*"?([a-zA-Z0-9\s+:_]+)"?$/);

      if (match) {
        const [, cheatNumber, cheatType, value] = match;
        const propertyName = propertyMap[cheatType];
        assembledCheats[cheatNumber] = assembledCheats[cheatNumber] || {
          desc: '',
          code: '',
          enable: false
        };

        assembledCheats[cheatNumber][propertyName] =
          propertyName === propertyMap.enable
            ? value.toLowerCase() === 'true'
            : value;
      }
    }

    return Object.values(assembledCheats) as ParsedCheats[];
  };

  const parsedCheatsToFile = (cheatsList: ParsedCheats[]): File | null => {
    const cheatsFileName = filepathToFileName(mGBA.gameName, '.cheats');
    if (!cheatsFileName) return null;

    const content =
      `cheats = ${cheatsList.length}\n\n` +
      cheatsList
        .map(
          ({ desc, enable, code }, idx) =>
            `cheat${idx}_desc = "${desc}"\ncheat${idx}_enable = ${enable}\ncheat${idx}_code = "${code}"\n`
        )
        .join('\n');

    return new File([new Blob([content])], cheatsFileName);
  };

  // emscriptens SDL_Keycode differs a bit from browser keycode/key mappings
  // this function takes in a keyboard event key, and returns the appropriate
  // SDL_Keycode key name for mGBA. See: https://wiki.libsdl.org/SDL2/SDL_Keycode
  const handleKeyBindingEdgeCases = ({ key, location }: KeyBinding): string => {
    // numpad keys are prefixed with 'Keypad' in emscripten SDL key mapping
    let gbaSDLKey = location === KEY_LOCATION_NUMPAD ? `Keypad ${key}` : key;

    // 'Enter' is named 'Return' in emscripten SDL key mapping
    if (gbaSDLKey.toLowerCase().includes('enter'))
      gbaSDLKey = gbaSDLKey.replace(/enter/gi, 'Return');

    // arrow keys have no prefix in emscripten SDL key mapping
    if (gbaSDLKey.toLowerCase().includes('arrow'))
      gbaSDLKey = gbaSDLKey.replace(/arrow/gi, '');

    return gbaSDLKey;
  };

  const resumeAudio = async (): Promise<void> => {
    if (!['suspended', 'interrupted'].includes(mGBA.SDL2.audioContext.state))
      return;

    try {
      await mGBA.SDL2.audioContext.resume();
    } catch {
      // best effort attempt at an audio teardown/resume for ios safari
      // context: we've most likely encountered `InvalidStateError: Failed to start the audio device`
      //          when in the interrupted state
      setTimeout(async () => {
        await mGBA.SDL2.audioContext.suspend();
        await mGBA.SDL2.audioContext.resume();
      }, 100);
    }
  };

  return {
    coreName: 'mGBA',
    addCoreCallbacks: (...args) => mGBA.addCoreCallbacks(...args),
    autoLoadCheats: () => mGBA.autoLoadCheats(),
    createSaveState: (...args) => mGBA.saveState(...args),
    // note: this solution will not be accurate for all keyboard types
    defaultKeyBindings: () => defaultKeyBindings,
    defaultAudioSampleRates: () => defaultSampleRates,
    defaultAudioBufferSizes: () => defaultAudioBufferSizes,
    defaultFileTypes: () => fileTypes,
    loadSaveState: (...args) => mGBA.loadState(...args),
    listCurrentSaveStates: () => {
      const baseSaveStateName = filepathToFileName(mGBA.gameName, '.ss');

      return mGBA.FS.readdir(paths.saveStatePath).filter(
        filterSaveStates(baseSaveStateName)
      );
    },
    getSaveState: (saveStateName: string) => {
      const cheatsPath = `${paths.saveStatePath}/${saveStateName}`;
      const exists = mGBA.FS.analyzePath(cheatsPath).exists;

      return exists ? mGBA.FS.readFile(cheatsPath) : new Uint8Array();
    },
    listRoms: () =>
      mGBA.listRoms().filter((romName) => !fileIgnorePaths.includes(romName)),
    setVolume: (...args) => mGBA.setVolume(...args),
    getVolume: () => mGBA.getVolume(),
    enableKeyboardInput: () => mGBA.toggleInput(true),
    disableKeyboardInput: () => mGBA.toggleInput(false),
    simulateKeyDown: (...args) => mGBA.buttonPress(...args),
    simulateKeyUp: (...args) => mGBA.buttonUnpress(...args),
    setFastForwardMultiplier: (...args) =>
      mGBA.setFastForwardMultiplier(...args),
    isFastForwardEnabled: () => mGBA.getFastForwardMultiplier() > 1,
    isSlowdownEnabled: () => mGBA.getFastForwardMultiplier() < -1,
    isFileExtensionOfType,
    run: (...args) => mGBA.loadGame(...args),
    getCurrentRom: () =>
      mGBA.gameName ? mGBA.FS.readFile(mGBA.gameName) : null,
    getCurrentGameName: () => filepathToFileName(mGBA.gameName),
    getCurrentSave: () => (mGBA.saveName ? mGBA.getSave() : null),
    getCurrentSaveName: () => filepathToFileName(mGBA.saveName),
    getCurrentAutoSaveStatePath: () =>
      mGBA.autoSaveStateName ? mGBA.autoSaveStateName : null,
    getFile: (path) => mGBA.FS.readFile(path),
    getStat: (path) => mGBA.FS.stat(path),
    uploadCheats: (...args) => mGBA.uploadCheats(...args),
    uploadPatch: (...args) => mGBA.uploadPatch(...args),
    uploadRom: (...args) => mGBA.uploadRom(...args),
    uploadSaveOrSaveState: (...args) => mGBA.uploadSaveOrSaveState(...args),
    deleteSaveState: (slot) => {
      const saveStateName = filepathToFileName(mGBA.gameName, '.ss' + slot);
      const saveStatePath = `${paths.saveStatePath}/${saveStateName}`;

      mGBA.FS.unlink(saveStatePath);
    },
    uploadScreenshot: (...args) => mGBA.uploadScreenshot(...args),
    deleteFile: mGBA.FS.unlink,
    pause: () => mGBA.pauseGame(),
    resume: async () => {
      await resumeAudio();
      mGBA.resumeGame();
    },
    quitGame: () => mGBA.quitGame(),
    quitEmulator: () => mGBA.quitMgba(),
    quickReload: () => mGBA.quickReload(),
    getCurrentCheatsFile: () => {
      const cheatsName = filepathToFileName(mGBA.gameName, '.cheats');
      const cheatsPath = `${paths.cheatsPath}/${cheatsName}`;
      const exists = mGBA.FS.analyzePath(cheatsPath).exists;

      return exists ? mGBA.FS.readFile(cheatsPath) : new Uint8Array();
    },
    getCurrentCheatsFileName: () =>
      filepathToFileName(mGBA.gameName, '.cheats'),
    screenshot: (...args) => mGBA.screenshot(...args),
    remapKeyBindings: (keyBindings) =>
      keyBindings.forEach((keyBinding) =>
        mGBA.bindKey(handleKeyBindingEdgeCases(keyBinding), keyBinding.gbaInput)
      ),
    filePaths: () => mGBA.filePaths(),
    fsSync: () => mGBA.FSSync(),
    toggleRewind: (...args) => mGBA.toggleRewind(...args),
    setCoreSettings: (...args) => mGBA.setCoreSettings(...args),
    forceAutoSaveState: () => mGBA.forceAutoSaveState(),
    loadAutoSaveState: () => mGBA.loadAutoSaveState(),
    getAutoSaveState: () => mGBA.getAutoSaveState(),
    uploadAutoSaveState: (...args) => mGBA.uploadAutoSaveState(...args),
    listAllFiles,
    parseCheatsString,
    parsedCheatsToFile
  };
};
