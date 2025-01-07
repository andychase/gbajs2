import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';

import { useAddCallbacks } from './use-add-callbacks.tsx';
import {
  emulatorFFMultiplierLocalStorageKey,
  emulatorGameNameLocalStorageKey,
  emulatorKeyBindingsLocalStorageKey,
  emulatorVolumeLocalStorageKey,
  emulatorCoreCallbacksLocalStorageKey
} from '../../context/emulator/consts.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

import type { CoreCallbackOptions } from './use-add-callbacks.tsx';
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
  const [coreCallbackOptions] = useLocalStorage<CoreCallbackOptions>(
    emulatorCoreCallbacksLocalStorageKey,
    {
      saveFileSystemOnInGameSave: true,
      saveFileSystemOnCreateUpdateDelete: true,
      notificationsEnabled: true
    }
  );
  const { addCallbacks } = useAddCallbacks();

  const run = useCallback(
    (romName: string) => {
      const romPath = `${emulator?.filePaths().gamePath}/${romName}`;
      const isSuccessfulRun = emulator?.run(romPath);
      setIsRunning(!!isSuccessfulRun);
      setStoredGameName(romName);

      if (isSuccessfulRun) {
        emulator?.setVolume(currentEmulatorVolume);

        if (currentKeyBindings) emulator?.remapKeyBindings(currentKeyBindings);

        if (fastForwardMultiplier > 1 && !emulator?.isFastForwardEnabled())
          emulator?.setFastForwardMultiplier(fastForwardMultiplier);

        addCallbacks(coreCallbackOptions);
      }

      return !!isSuccessfulRun;
    },
    [
      addCallbacks,
      coreCallbackOptions,
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
