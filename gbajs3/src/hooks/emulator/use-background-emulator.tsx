import { useVisibilityChange } from '@uidotdev/usehooks';
import { useEffect, useState } from 'react';

import { useEmulatorContext, useRunningContext } from '../context.tsx';

type UseBackgroundEmulatorProps = {
  isPaused: boolean;
};

/**
 * Performs the following actions when the page goes into the background
 *
 * - pauses the emulator when the document is no longer visible,
 * - resumes the emulator when the document is visible again (if applicable)
 * - pauses the main loop to prevent the emulator internal time delta from thinking the clock is still ticking
 * - takes an auto save such that no progress will be lost
 */
export const useBackgroundEmulator = ({
  isPaused
}: UseBackgroundEmulatorProps) => {
  const isDocumentVisible = useVisibilityChange();
  const { emulator } = useEmulatorContext();
  const { isRunning } = useRunningContext();
  const [pausedForBackground, setPausedForBackground] = useState(false);

  const isRunningAndNotPaused = isRunning && !isPaused;

  useEffect(() => {
    if (isRunningAndNotPaused) {
      if (!isDocumentVisible && !pausedForBackground) {
        emulator?.pause();
        emulator?.forceAutoSaveState();
        setPausedForBackground(true);
      } else if (isDocumentVisible && pausedForBackground) {
        emulator?.resume();
        setPausedForBackground(false);
      }
    }
  }, [emulator, isDocumentVisible, isRunningAndNotPaused, pausedForBackground]);
};
