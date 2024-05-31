import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';

import { useRunGame } from './use-run-game.tsx';
import { emulatorGameNameLocalStorageKey } from '../../context/emulator/consts.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

export const useQuickReload = () => {
  const runGame = useRunGame();
  const { isRunning, setIsRunning } = useRunningContext();
  const { emulator } = useEmulatorContext();
  const [storedGameName] = useLocalStorage<string | undefined>(
    emulatorGameNameLocalStorageKey
  );

  const run = useCallback(() => {
    if (isRunning) {
      emulator?.quickReload();
    } else if (emulator?.getCurrentGameName()) {
      const isSuccessfulRun = runGame(
        emulator.filePaths().gamePath + '/' + emulator.getCurrentGameName()
      );
      setIsRunning(!!isSuccessfulRun);
    } else if (storedGameName) {
      const isSuccessfulRun = runGame(storedGameName);
      setIsRunning(!!isSuccessfulRun);
    }
  }, [emulator, isRunning, setIsRunning, runGame, storedGameName]);

  return run;
};
