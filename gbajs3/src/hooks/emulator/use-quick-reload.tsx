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

  const quickReload = useCallback(() => {
    const currentGameName = emulator?.getCurrentGameName();

    if (isRunning) {
      emulator?.quickReload();
    } else {
      const gameName = currentGameName ?? storedGameName;
      if (gameName) setIsRunning(runGame(gameName));
    }
  }, [emulator, isRunning, setIsRunning, runGame, storedGameName]);

  return quickReload;
};
