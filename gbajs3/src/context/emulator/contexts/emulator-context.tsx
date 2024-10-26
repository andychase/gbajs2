import { createContext } from 'react';

import type { GBAEmulator } from '../../../emulator/mgba/mgba-emulator';
import type { Dispatch, SetStateAction } from 'react';

type EmulatorContextProps = {
  emulator: GBAEmulator | null;
  canvas: HTMLCanvasElement | null;
  setCanvas: Dispatch<SetStateAction<HTMLCanvasElement | null>>;
};

export const EmulatorContext = createContext<EmulatorContextProps | null>(null);

EmulatorContext.displayName = 'EmulatorContext';
