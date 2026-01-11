import { useCallback, useSyncExternalStore } from 'react';

import { useEmulatorContext } from '../context.tsx';

const listeners = new Set<() => void>();

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const trigger = () => {
  listeners.forEach((cb) => {
    cb();
  });
};

export const useFileStat = (path?: string | null) => {
  const { emulator } = useEmulatorContext();
  const getSnapshot = useCallback(() => {
    if (!path) return undefined;

    try {
      return emulator?.getStat(path).mtime.getTime();
    } catch {
      return null;
    }
  }, [path, emulator]);

  const modifiedTime = useSyncExternalStore(subscribe, getSnapshot);

  return { modifiedTime, trigger };
};
