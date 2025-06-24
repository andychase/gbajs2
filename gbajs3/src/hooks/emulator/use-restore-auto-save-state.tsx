import { useLocalStorage } from '@uidotdev/usehooks';
import { useEffect } from 'react';

import { emulatorAutoSaveUnloadLocalStorageKey } from '../../context/emulator/consts.ts';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator';

type AutoSaveData = {
  filename: string;
  data: string;
  timestamp: string;
  event: string;
};

const base64ToUint8Array = (base64: string) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const useRestoreAutoSaveStateData = (emulator: GBAEmulator | null) => {
  const [storedAutoSaveData, setStoredAutoSaveData] = useLocalStorage<
    AutoSaveData | undefined
  >(emulatorAutoSaveUnloadLocalStorageKey);

  useEffect(() => {
    const initializeAutoSaveState = async () => {
      if (
        !emulator ||
        !storedAutoSaveData?.data ||
        !storedAutoSaveData?.filename
      )
        return;

      const dataUint8 = base64ToUint8Array(storedAutoSaveData.data);

      await emulator.uploadAutoSaveState(
        storedAutoSaveData.filename,
        dataUint8
      );
      setStoredAutoSaveData(undefined);
    };

    initializeAutoSaveState();
  }, [
    emulator,
    storedAutoSaveData?.filename,
    storedAutoSaveData?.data,
    setStoredAutoSaveData
  ]);
};
