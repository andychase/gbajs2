/// <reference types="emscripten" />

declare namespace mGBA {
  export interface filePaths {
    root: string;
    cheatsPath: string;
    gamePath: string;
    savePath: string;
    saveStatePath: string;
  }

  // Note: this method is available, but missing from emscripten typings
  // see: https://emscripten.org/docs/api_reference/Filesystem-API.html#FS.analyzePath
  interface FSWithAnalyze {
    analyzePath: (
      path: string,
      dontResolveLastLink?: boolean
    ) => {
      isRoot: boolean;
      exists: boolean;
      error: Error;
      name: string;
      path: string;
      object: FS.FSNode;
      parentExists: boolean;
      parentPath: stringToUTF16;
      parentObject: FS.FSNode;
    };
  }

  // see: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state
  //      interrupted is a valid property on iOS
  type ExtendedAudioContextState = AudioContextState | 'interrupted';

  export interface mGBAEmulator extends EmscriptenModule {
    // custom methods from preamble
    autoLoadCheats(): boolean;
    bindKey(bindingName: string, inputName: string): void;
    buttonPress(name: string): void;
    buttonUnpress(name: string): void;
    FSInit(): Promise<void>;
    FSSync(): Promise<void>;
    getMainLoopTimingMode(): number;
    getMainLoopTimingValue(): number;
    getSave(): Uint8Array;
    getVolume(): number;
    listRoms(): void;
    listSaves(): void;
    loadGame(romPath: string): boolean;
    loadState(slot: number): boolean;
    pauseGame(): void;
    quickReload(): void;
    quitGame(): void;
    quitMgba(): void;
    resumeGame(): void;
    saveState(slot: number): boolean;
    screenShot(callback: () => void): void;
    setMainLoopTiming(mode: number, value: number): void;
    setVolume(percent: number): void;
    toggleInput(enabled: boolean): void;
    uploadCheats(file: File, callback?: () => void): void;
    uploadRom(file: File, callback?: () => void): void;
    uploadSaveOrSaveState(file: File, callback?: () => void): void;
    // custom variables
    version: {
      projectName: string;
      projectVersion: string;
    };
    filePaths(): filePaths;
    gameName?: string;
    saveName?: string;
    // extra exported runtime methods
    FS: typeof FS & FSWithAnalyze;
    // SDL2
    SDL2: {
      audio: {
        currentOutputBuffer: AudioBuffer;
        scriptProcessorNode: ScriptProcessorNode;
      };
      audioContext: Omit<AudioContext, 'state'> & {
        readonly state: ExtendedAudioContextState;
      };
    };
  }

  // eslint-disable-next-line import/no-default-export
  export default function mGBA(options: {
    canvas: HTMLCanvasElement;
  }): Promise<mGBAEmulator>;
}

export = mGBA;
