import { useCallback } from 'react';

import { fadeCanvas } from '../../components/screen/fade.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

const generateScreenshot = (emulator: GBAEmulator | null) => {
  if (!emulator) return null;

  const fileName = 'fade-copy.png';
  const filePath = emulator?.filePaths().screenshotsPath + '/' + fileName;
  const successful = emulator.screenshot(fileName);

  if (!successful) return null;

  const fileBytes = emulator.getFile(filePath);

  emulator?.deleteFile(filePath);

  return new Blob([fileBytes], { type: 'image/png' });
};

export const useQuitGame = () => {
  const { canvas, emulator } = useEmulatorContext();
  const { isRunning, setIsRunning } = useRunningContext();

  const quitGame = useCallback(() => {
    if (isRunning) {
      fadeCanvas(canvas, generateScreenshot(emulator));
      emulator?.quitGame();
    }
    setIsRunning(false);
  }, [canvas, emulator, isRunning, setIsRunning]);

  return quitGame;
};
