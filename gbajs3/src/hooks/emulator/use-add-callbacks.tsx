import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { emulatorSettingsLocalStorageKey } from '../../context/emulator/consts.ts';
import { useEmulatorContext } from '../context.tsx';
import { useFileStat } from './use-file-stat.tsx';

import type { EmulatorSettings } from '../../components/modals/emulator-settings.tsx';

export type CoreCallbackOptions = {
  saveFileSystemOnInGameSave: boolean;
  autoSaveStateLoadNotificationEnabled: boolean;
  autoSaveStateCaptureNotificationEnabled: boolean;
  fileSystemNotificationsEnabled: boolean;
};

type SyncActionIfEnabledProps = {
  withToast?: boolean;
};

// return a function or null based on a condition, null clears the callback in
// question, undefined allows for partial updates if desired in the future
const optionalFunc = (condition: boolean, func: () => void) =>
  condition ? func : null;

export const useAddCallbacks = () => {
  const { emulator } = useEmulatorContext();
  const [emulatorSettings] = useLocalStorage<EmulatorSettings | undefined>(
    emulatorSettingsLocalStorageKey
  );
  const autoSaveStatePath = emulator?.getCurrentAutoSaveStatePath();
  const { trigger } = useFileStat(autoSaveStatePath);

  const syncActionIfEnabled = useCallback(
    async ({ withToast = true }: SyncActionIfEnabledProps = {}) => {
      if (emulatorSettings?.saveFileSystemOnCreateUpdateDelete) {
        await emulator?.fsSync();
        if (emulatorSettings?.fileSystemNotificationsEnabled && withToast)
          toast.success('Saved File System');
      }
    },
    [
      emulator,
      emulatorSettings?.saveFileSystemOnCreateUpdateDelete,
      emulatorSettings?.fileSystemNotificationsEnabled
    ]
  );

  const addCallbacks = useCallback(
    (options: CoreCallbackOptions) =>
      emulator?.addCoreCallbacks({
        saveDataUpdatedCallback: optionalFunc(
          options.saveFileSystemOnInGameSave,
          async () => {
            await emulator.fsSync();
            if (options.fileSystemNotificationsEnabled)
              toast.success('Saved File System');
          }
        ),
        autoSaveStateLoadedCallback: optionalFunc(
          options.autoSaveStateLoadNotificationEnabled,
          () => toast.success('Auto save state loaded')
        ),
        autoSaveStateCapturedCallback: optionalFunc(
          options.autoSaveStateCaptureNotificationEnabled,
          () => {
            toast.success('Auto save state captured');
            trigger();
          }
        )
      }),
    [emulator, trigger]
  );

  return {
    addCallbacks,
    syncActionIfEnabled
  };
};
