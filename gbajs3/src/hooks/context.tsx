import { useContext, type Context } from 'react';

import { AuthContext } from '../context/auth/auth-context.tsx';
import { DragContext } from '../context/emulator/contexts/drag-context.tsx';
import { EmulatorContext } from '../context/emulator/contexts/emulator-context.tsx';
import { ResizeContext } from '../context/emulator/contexts/resize-context.tsx';
import { RunningContext } from '../context/emulator/contexts/running-context.tsx';
import { InitialBoundsContext } from '../context/initial-bounds/initial-bounds-context.tsx';
import { LayoutContext } from '../context/layout/layout-context.tsx';
import { ModalContext } from '../context/modal/modal-context.tsx';

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

// initial bounds
export const useInitialBoundsContext = () =>
  useLoadContext(InitialBoundsContext);

// layout
export const useLayoutContext = () => useLoadContext(LayoutContext);

// modal
export const useModalContext = () => useLoadContext(ModalContext);

// emulator
export const useEmulatorContext = () => useLoadContext(EmulatorContext);
export const useDragContext = () => useLoadContext(DragContext);
export const useResizeContext = () => useLoadContext(ResizeContext);
export const useRunningContext = () => useLoadContext(RunningContext);
