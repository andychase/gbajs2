import type {
  coreCallbacks,
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
};

export type ParsedCheats = {
  desc: string;
  code: string;
  enable: boolean;
};

export type GBAEmulator = {
  addCoreCallbacks: (coreCallbacks: coreCallbacks) => void;
  autoLoadCheats: () => boolean;
  createSaveState: (slot: number) => boolean;
  defaultKeyBindings: () => KeyBinding[];
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
  getVolume: () => number;
  isFastForwardEnabled: () => boolean;
  listAllFiles: () => FileNode;
  listRoms: () => string[];
  listSaveStates: () => string[];
  loadSaveState: (slot: number) => boolean;
  parseCheatsString: (cheatsStr: string) => ParsedCheats[];
  parsedCheatsToFile: (cheatsList: ParsedCheats[]) => File | null;
  pause: () => void;
  quickReload: () => void;
  quitEmulator: () => void;
  quitGame: () => void;
  remapKeyBindings: (keyBindings: KeyBinding[]) => void;
  resume: () => Promise<void>;
  run: (romPath: string) => boolean;
  screenshot: (fileName?: string) => boolean;
  setCurrentGameName: (gameName: string | undefined) => void;
  setFastForwardMultiplier: (multiplier: number) => void;
  setVolume: (volumePercent: number) => void;
  simulateKeyDown: (keyId: string) => void;
  simulateKeyUp: (keyId: string) => void;
  uploadCheats: (file: File, callback?: () => void) => void;
  uploadPatch: (file: File, callback?: () => void) => void;
  uploadRom: (file: File, callback?: () => void) => void;
  uploadSaveOrSaveState: (file: File, callback?: () => void) => void;
};

export const KEY_LOCATION_STANDARD = 0;
export const KEY_LOCATION_NUMPAD = 3;

export const mGBAEmulator = (mGBA: mGBAEmulatorTypeDef): GBAEmulator => {
  const paths = mGBA.filePaths();

  const filepathToFileName = (
    path: string | undefined,
    extension?: string | undefined
  ) => {
    let fileName = path?.split('/')?.pop();
    if (extension) {
      const ext = '.' + fileName?.split('.')?.pop();
      fileName = fileName?.replace(ext, extension);
    }

    return fileName;
  };

  const listAllFiles = () => {
    const root: FileNode = { path: paths.root, isDir: true, children: [] };
    const ignorePaths = ['.', '..'];

    const recursiveRead = ({ path, children }: FileNode) => {
      for (const name of mGBA.FS.readdir(path)) {
        if (ignorePaths.includes(name)) continue;

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
    const ignoreLines = ['cheats = ', ''];

    if (!lines?.[0]?.match('^cheats = [0-9]+$')) return [];

    const assembledCheats: {
      [cheatNumber: string]: {
        [cheatType: string]: string | boolean;
      };
    } = {};
    const propertyMap: { [key: string]: keyof ParsedCheats } = {
      desc: 'desc',
      code: 'code',
      enable: 'enable'
    };

    for (const cheatLine of lines) {
      if (ignoreLines.includes(cheatLine)) continue;

      const match = cheatLine.match(
        /^cheat([0-9]+)_([a-zA-Z]+)\s*=\s*"?([a-zA-Z0-9\s+:_]+)"?$/
      );

      if (match) {
        const [, cheatNumber, cheatType, value] = match;
        const propertyName = propertyMap[cheatType];
        assembledCheats[cheatNumber] = assembledCheats[cheatNumber] || {
          desc: '',
          code: '',
          enable: false
        };
        if (propertyName)
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

    const content = cheatsList.length
      ? `cheats = ${cheatsList.length}\n\n` +
        cheatsList
          .map(
            ({ desc, enable, code }, idx) =>
              `cheat${idx}_desc = "${desc}"\ncheat${idx}_enable = ${enable}\ncheat${idx}_code = "${code}"`
          )
          .join('\n')
      : '';

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

  const resumeAudio = async () => {
    if (
      mGBA.SDL2.audioContext.state === 'suspended' ||
      mGBA.SDL2.audioContext.state === 'interrupted'
    )
      await mGBA.SDL2.audioContext.resume();
  };

  return {
    addCoreCallbacks: mGBA.addCoreCallbacks,
    autoLoadCheats: mGBA.autoLoadCheats,
    createSaveState: mGBA.saveState,
    // note: this solution will not be accurate for all keyboard types
    defaultKeyBindings: () => [
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
    ],
    loadSaveState: mGBA.loadState,
    listSaveStates: () => mGBA.FS.readdir(paths.saveStatePath),
    listRoms: mGBA.listRoms,
    setVolume: mGBA.setVolume,
    getVolume: mGBA.getVolume,
    enableKeyboardInput: () => mGBA.toggleInput(true),
    disableKeyboardInput: () => mGBA.toggleInput(false),
    simulateKeyDown: mGBA.buttonPress,
    simulateKeyUp: mGBA.buttonUnpress,
    setFastForwardMultiplier: mGBA.setFastForwardMultiplier,
    isFastForwardEnabled: () => mGBA.getFastForwardMultiplier() > 1,
    run: mGBA.loadGame,
    getCurrentRom: () =>
      mGBA.gameName ? mGBA.FS.readFile(mGBA.gameName) : null,
    getCurrentGameName: () => filepathToFileName(mGBA.gameName),
    setCurrentGameName: (gameName) => {
      if (gameName && !mGBA.gameName) mGBA.gameName = gameName;
    },
    getCurrentSave: () => (mGBA.saveName ? mGBA.getSave() : null),
    getCurrentSaveName: () => filepathToFileName(mGBA.saveName),
    getFile: (path) => mGBA.FS.readFile(path),
    uploadCheats: mGBA.uploadCheats,
    uploadPatch: mGBA.uploadPatch,
    uploadRom: mGBA.uploadRom,
    uploadSaveOrSaveState: mGBA.uploadSaveOrSaveState,
    deleteSaveState: (slot) => {
      const saveStateName = filepathToFileName(mGBA.saveName, '.ss' + slot);
      const saveStatePath = `${paths.saveStatePath}/${saveStateName}`;

      mGBA.FS.unlink(saveStatePath);
    },
    deleteFile: mGBA.FS.unlink,
    pause: mGBA.pauseGame,
    resume: async () => {
      await resumeAudio();
      mGBA.resumeGame();
    },
    quitGame: mGBA.quitGame,
    quitEmulator: mGBA.quitMgba,
    quickReload: mGBA.quickReload,
    getCurrentCheatsFile: () => {
      const cheatsName = filepathToFileName(mGBA.gameName, '.cheats');
      const cheatsPath = `${paths.cheatsPath}/${cheatsName}`;
      const exists = mGBA.FS.analyzePath(cheatsPath).exists;

      return exists ? mGBA.FS.readFile(cheatsPath) : new Uint8Array();
    },
    getCurrentCheatsFileName: () =>
      filepathToFileName(mGBA.gameName, '.cheats'),
    screenshot: mGBA.screenshot,
    remapKeyBindings: (keyBindings) =>
      keyBindings.forEach((keyBinding) =>
        mGBA.bindKey(handleKeyBindingEdgeCases(keyBinding), keyBinding.gbaInput)
      ),
    filePaths: mGBA.filePaths,
    fsSync: mGBA.FSSync,
    listAllFiles,
    parseCheatsString,
    parsedCheatsToFile
  };
};
