import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';

import { useAddCallbacks } from './use-add-callbacks.tsx';
import {
  emulatorFFMultiplierLocalStorageKey,
  emulatorGameNameLocalStorageKey,
  emulatorKeyBindingsLocalStorageKey,
  emulatorVolumeLocalStorageKey,
  emulatorSettingsLocalStorageKey
} from '../../context/emulator/consts.ts';
import { useEmulatorContext, useRunningContext } from '../context.tsx';

import type { EmulatorSettings } from '../../components/modals/emulator-settings.tsx';
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
  const [emulatorSettings] = useLocalStorage<EmulatorSettings>(
    emulatorSettingsLocalStorageKey,
    {
      saveFileSystemOnInGameSave: true,
      saveFileSystemOnCreateUpdateDelete: true,
      fileSystemNotificationsEnabled: true,
      allowOpposingDirections: true,
      muteOnFastForward: true,
      muteOnRewind: true
    }
  );
  const { addCallbacks } = useAddCallbacks();

  const run = useCallback(
    (romName: string) => {
      const romPath = `${emulator?.filePaths().gamePath}/${romName}`;
      const saveOverridePath = emulatorSettings?.saveFileName
        ? `${emulator?.filePaths().savePath}/${emulatorSettings?.saveFileName}`
        : undefined;
      const isSuccessfulRun = emulator?.run(romPath, saveOverridePath);
      setIsRunning(!!isSuccessfulRun);
      setStoredGameName(romName);

      if (isSuccessfulRun) {
        emulator?.setVolume(currentEmulatorVolume);

        if (currentKeyBindings) emulator?.remapKeyBindings(currentKeyBindings);

        if (fastForwardMultiplier > 1 && !emulator?.isFastForwardEnabled())
          emulator?.setFastForwardMultiplier(fastForwardMultiplier);

        addCallbacks({
          saveFileSystemOnInGameSave:
            emulatorSettings?.saveFileSystemOnInGameSave,
          fileSystemNotificationsEnabled:
            emulatorSettings?.fileSystemNotificationsEnabled
        });

        emulator?.setCoreSettings({
          allowOpposingDirections: emulatorSettings.allowOpposingDirections,
          rewindBufferCapacity: emulatorSettings.rewindBufferCapacity,
          rewindBufferInterval: emulatorSettings.rewindBufferInterval,
          frameSkip: emulatorSettings.frameSkip
        });
      }

      return !!isSuccessfulRun;
    },
    [
      addCallbacks,
      currentEmulatorVolume,
      currentKeyBindings,
      emulator,
      emulatorSettings,
      fastForwardMultiplier,
      setIsRunning,
      setStoredGameName
    ]
  );

  return run;
};
