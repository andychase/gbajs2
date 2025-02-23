import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useAuthContext,
  useDragContext,
  useEmulatorContext,
  useInitialBoundsContext,
  useLayoutContext,
  useModalContext,
  useResizeContext,
  useRunningContext
} from './context.tsx';
import { AuthContext } from '../context/auth/auth-context.tsx';
import { DragContext } from '../context/emulator/contexts/drag-context.tsx';
import { EmulatorContext } from '../context/emulator/contexts/emulator-context.tsx';
import { ResizeContext } from '../context/emulator/contexts/resize-context.tsx';
import { RunningContext } from '../context/emulator/contexts/running-context.tsx';
import { InitialBoundsContext } from '../context/initial-bounds/initial-bounds-context.tsx';
import { LayoutContext } from '../context/layout/layout-context.tsx';
import { ModalContext } from '../context/modal/modal-context.tsx';

import type * as authContextExports from '../context/auth/auth-context.tsx';

describe('useContext hooks', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const contextHooks = [
    [useAuthContext, AuthContext.displayName],
    [useInitialBoundsContext, InitialBoundsContext.displayName],
    [useLayoutContext, LayoutContext.displayName],
    [useModalContext, ModalContext.displayName],
    [useEmulatorContext, EmulatorContext.displayName],
    [useDragContext, DragContext.displayName],
    [useResizeContext, ResizeContext.displayName],
    [useRunningContext, RunningContext.displayName]
  ] as const;

  it.each(contextHooks)(
    'throws error when used outside of the proper provider',
    (contextHook, contextName) => {
      // silence console errors as they are expected
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => contextHook());
      }).toThrow(
        `${contextName} must be loaded under the matching ${contextName}.Provider`
      );
    }
  );

  it('throws error with default message if no context display name', async () => {
    // silence console errors as they are expected
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.doMock('../context/auth/auth-context.tsx', async () => {
      const { AuthContext: original, ...rest } = await vi.importActual<
        typeof authContextExports
      >('../context/auth/auth-context.tsx');

      return {
        ...rest,
        AuthContext: { ...original, displayName: undefined }
      };
    });
    // we must reimport the component under test
    const { useAuthContext } = await import('./context.tsx');

    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow(`This context must be loaded under the matching Provider`);
  });
});
