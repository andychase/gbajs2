import { useCallback, useEffect } from 'react';

import { useEmulatorContext, useRunningContext } from '../context.tsx';
import { useFadeCanvas } from '../use-fade-canvas.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

const generateScreenshot = (emulator: GBAEmulator | null) => {
  if (!emulator) return null;

  const fileName = 'fade-copy.png';
  const filePath = emulator?.filePaths().screenshotsPath + '/' + fileName;
  const successful = emulator.screenshot(fileName);

  if (!successful) return null;

  const fileBytes = emulator.getFile(filePath);

  emulator?.deleteFile(filePath);

  return new Blob([fileBytes.slice()], { type: 'image/png' });
};

export const useQuitGame = () => {
  const { canvas, emulator } = useEmulatorContext();
  const { isRunning, setIsRunning } = useRunningContext();
  const { startFade, cancelFade } = useFadeCanvas();

  useEffect(() => {
    if (isRunning) cancelFade();
  }, [isRunning, cancelFade]);

  const quitGame = useCallback(() => {
    if (isRunning) {
      startFade(canvas, generateScreenshot(emulator));
      emulator?.quitGame();
    }
    setIsRunning(false);
  }, [canvas, emulator, isRunning, setIsRunning, startFade]);

  return quitGame;
};
