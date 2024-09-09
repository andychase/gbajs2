import { useLocalStorage } from '@uidotdev/usehooks';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { emulatorCoreCallbacksLocalStorageKey } from '../../context/emulator/consts.ts';
import { useRunningContext, useEmulatorContext } from '../context.tsx';

export type CoreCallbackOptions = {
  saveFileSystemOnInGameSave: boolean;
  notificationsEnabled?: boolean;
};

// return a function or null based on a condition, null clears the callback in
// question, undefined allows for partial updates if desired in the future
const optionalFunc = (condition: boolean, func: () => void) =>
  condition ? func : null;

export const useAddCallbacks = () => {
  const { isRunning } = useRunningContext();
  const { emulator } = useEmulatorContext();
  const [, setFileSystemOptions] = useLocalStorage<
    CoreCallbackOptions | undefined
  >(emulatorCoreCallbacksLocalStorageKey);

  const addCallbacks = useCallback(
    (options: CoreCallbackOptions) =>
      emulator?.addCoreCallbacks({
        saveDataUpdatedCallback: optionalFunc(
          options.saveFileSystemOnInGameSave,
          () => {
            emulator.fsSync();
            if (options.notificationsEnabled)
              toast.success('Saved File System ');
          }
        )
      }),
    [emulator]
  );

  const addCallbacksAndSaveSettings = useCallback(
    (options: CoreCallbackOptions) => {
      setFileSystemOptions((prevState) => ({
        ...prevState,
        ...options
      }));

      if (isRunning) addCallbacks(options);
    },
    [addCallbacks, isRunning, setFileSystemOptions]
  );

  return { addCallbacks, addCallbacksAndSaveSettings };
};
