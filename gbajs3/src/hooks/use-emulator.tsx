import { useEffect, useState } from 'react';

import {
  mGBAEmulator,
  type GBAEmulator
} from '../emulator/mgba/mgba-emulator.tsx';
import mGBA from '../emulator/mgba/wasm/mgba.js';

export const useEmulator = (canvas: HTMLCanvasElement | null) => {
  const [emulator, setEmulator] = useState<GBAEmulator | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (canvas) {
        const Module = await mGBA({ canvas });

        const mGBAVersion =
          Module.version.projectName + ' ' + Module.version.projectVersion;
        console.log(mGBAVersion);

        await Module.FSInit();

        const emulator = mGBAEmulator(Module);

        setEmulator(emulator);
      }
    };

    initialize();
  }, [canvas]);

  return emulator;
};
