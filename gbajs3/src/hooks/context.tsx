import { useContext, type Context } from 'react';

import { AuthContext } from '../context/auth/auth.tsx';
import { DragContext } from '../context/emulator/drag.tsx';
import { EmulatorContext } from '../context/emulator/emulator.tsx';
import { ResizeContext } from '../context/emulator/resize.tsx';
import { RunningContext } from '../context/emulator/running.tsx';
import { LayoutContext } from '../context/layout/layout.tsx';
import { ModalContext } from '../context/modal/modal.tsx';

const useLoadContext = <T,>(context: Context<T>) => {
  const displayName = context.displayName;
  const loadedContext = useContext(context);

  if (!loadedContext)
    throw new Error(
      `${displayName ?? 'This context'} must be loaded under the matching ${
        displayName ? `${displayName}.Provider` : 'Provider'
      }`
    );

  return loadedContext;
};

// auth
export const useAuthContext = () => useLoadContext(AuthContext);

// layout
export const useLayoutContext = () => useLoadContext(LayoutContext);

// modal
export const useModalContext = () => useLoadContext(ModalContext);

// emulator
export const useEmulatorContext = () => useLoadContext(EmulatorContext);
export const useDragContext = () => useLoadContext(DragContext);
export const useResizeContext = () => useLoadContext(ResizeContext);
export const useRunningContext = () => useLoadContext(RunningContext);
