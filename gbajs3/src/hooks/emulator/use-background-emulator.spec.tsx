import * as usehooks from '@uidotdev/usehooks';
import { describe, expect, it, vi } from 'vitest';

import { useBackgroundEmulator } from './use-background-emulator.tsx';
import { renderHookWithContext } from '../../../test/render-hook-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

vi.mock('@uidotdev/usehooks', async (importOriginal) => {
  const actual = await importOriginal<typeof usehooks>();
  return {
    ...actual,
    useVisibilityChange: vi.fn()
  };
});

describe('useBackgroundEmulator hook', () => {
  it('pauses emulator when entering background if running and not paused', () => {
    const emulatorPauseSpy: () => void = vi.fn();
    const emulatorResumeSpy: () => void = vi.fn();
    const emulatorForceAutoSaveStateSpy: () => boolean = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      setCanvas: vi.fn(),
      canvas: null,
      emulator: {
        pause: emulatorPauseSpy,
        resume: emulatorResumeSpy,
        forceAutoSaveState: emulatorForceAutoSaveStateSpy
      } as GBAEmulator
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      isRunning: true,
      setIsRunning: vi.fn()
    }));

    vi.spyOn(usehooks, 'useVisibilityChange')
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const { rerender } = renderHookWithContext(() =>
      useBackgroundEmulator({ isPaused: false })
    );

    expect(emulatorPauseSpy).toHaveBeenCalledOnce();
    expect(emulatorForceAutoSaveStateSpy).toHaveBeenCalledOnce();

    rerender();

    // resumes emulator when coming back from background
    expect(emulatorResumeSpy).toHaveBeenCalledOnce();
  });
});
