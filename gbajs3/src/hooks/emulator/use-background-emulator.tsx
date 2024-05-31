import { useVisibilityChange } from '@uidotdev/usehooks';
import { useEffect, useState } from 'react';

import { useEmulatorContext, useRunningContext } from '../context.tsx';

type UseBackgroundEmulatorProps = {
  isPaused: boolean;
};

// pauses the emulator when the document is no longer visible,
// resumes the emulator when the document is visible again (if applicable)
// prevents the emulator internal time delta from thinking the clock is still ticking
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
        setPausedForBackground(true);
      } else if (isDocumentVisible && pausedForBackground) {
        emulator?.resume();
        setPausedForBackground(false);
      }
    }
  }, [emulator, isDocumentVisible, isRunningAndNotPaused, pausedForBackground]);
};
