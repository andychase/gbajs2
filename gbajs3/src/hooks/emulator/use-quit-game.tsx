import { useCallback } from 'react';

import { fadeCanvas } from '../../components/screen/fade.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

export const useQuitGame = () => {
  const { canvas, emulator } = useEmulatorContext();
  const { setIsRunning } = useRunningContext();

  const run = useCallback(() => {
    if (emulator) {
      fadeCanvas(canvas, emulator.screenShot);
      emulator.quitGame();
    }
    setIsRunning(false);
  }, [canvas, emulator, setIsRunning]);

  return run;
};
