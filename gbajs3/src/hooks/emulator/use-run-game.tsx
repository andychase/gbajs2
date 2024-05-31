import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';

import {
  emulatorFFMultiplierLocalStorageKey,
  emulatorGameNameLocalStorageKey,
  emulatorKeyBindingsLocalStorageKey,
  emulatorVolumeLocalStorageKey
} from '../../context/emulator/consts.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

import type { KeyBinding } from '../../emulator/mgba/mgba-emulator.tsx';

export const useRunGame = () => {
  const { emulator } = useEmulatorContext();
  const { setIsRunning } = useRunningContext();
  const [, setStoredGameName] = useLocalStorage<string | undefined>(
    emulatorGameNameLocalStorageKey
  );
  const [currentKeyBindings] = useLocalStorage<KeyBinding[] | undefined>(
    emulatorKeyBindingsLocalStorageKey
  );
  const [currentEmulatorVolume] = useLocalStorage(
    emulatorVolumeLocalStorageKey,
    1
  );
  const [fastForwardMultiplier] = useLocalStorage(
    emulatorFFMultiplierLocalStorageKey,
    1
  );

  const run = useCallback(
    (romPath: string) => {
      const isSuccessfulRun = emulator?.run(romPath);
      setIsRunning(!!isSuccessfulRun);
      setStoredGameName(romPath);
      emulator?.setVolume(currentEmulatorVolume);

      if (isSuccessfulRun) {
        if (currentKeyBindings) emulator?.remapKeyBindings(currentKeyBindings);

        if (fastForwardMultiplier > 1 && !emulator?.isFastForwardEnabled())
          emulator?.setFastForwardMultiplier(fastForwardMultiplier);
      }

      return !!isSuccessfulRun;
    },
    [
      currentEmulatorVolume,
      currentKeyBindings,
      emulator,
      fastForwardMultiplier,
      setIsRunning,
      setStoredGameName
    ]
  );

  return run;
};
