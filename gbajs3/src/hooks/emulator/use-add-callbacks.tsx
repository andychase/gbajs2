import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { emulatorCoreCallbacksLocalStorageKey } from '../../context/emulator/consts.ts';
import { useRunningContext, useEmulatorContext } from '../context.tsx';

export type CoreCallbackOptions = {
  saveFileSystemOnInGameSave: boolean;
  saveFileSystemOnCreateUpdateDelete?: boolean;
  notificationsEnabled?: boolean;
};

type SyncActionIfEnabledProps = {
  withToast?: boolean;
};

// return a function or null based on a condition, null clears the callback in
// question, undefined allows for partial updates if desired in the future
const optionalFunc = (condition: boolean, func: () => void) =>
  condition ? func : null;

export const useAddCallbacks = () => {
  const { isRunning } = useRunningContext();
  const { emulator } = useEmulatorContext();
  const [coreCallbackOptions, setCoreCallbackOptions] = useLocalStorage<
    CoreCallbackOptions | undefined
  >(emulatorCoreCallbacksLocalStorageKey);

  const syncActionIfEnabled = useCallback(
    async ({ withToast = true }: SyncActionIfEnabledProps = {}) => {
      if (coreCallbackOptions?.saveFileSystemOnCreateUpdateDelete) {
        await emulator?.fsSync();
        if (coreCallbackOptions?.notificationsEnabled && withToast)
          toast.success('Saved File System');
      }
    },
    [
      emulator,
      coreCallbackOptions?.saveFileSystemOnCreateUpdateDelete,
      coreCallbackOptions?.notificationsEnabled
    ]
  );

  const addCallbacks = useCallback(
    (options: CoreCallbackOptions) =>
      emulator?.addCoreCallbacks({
        saveDataUpdatedCallback: optionalFunc(
          options.saveFileSystemOnInGameSave,
          async () => {
            await emulator.fsSync();
            if (options.notificationsEnabled)
              toast.success('Saved File System');
          }
        )
      }),
    [emulator]
  );

  const addCallbacksAndSaveSettings = useCallback(
    (options: CoreCallbackOptions) => {
      setCoreCallbackOptions((prevState) => ({
        ...prevState,
        ...options
      }));

      if (isRunning) addCallbacks(options);
    },
    [addCallbacks, isRunning, setCoreCallbackOptions]
  );

  return {
    addCallbacks,
    addCallbacksAndSaveSettings,
    syncActionIfEnabled
  };
};
