import { useContext, type Context } from 'react';

import { AuthContext } from '../context/auth/auth.tsx';
import { EmulatorContext } from '../context/emulator/emulator.tsx';
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

export const useAuthContext = () => useLoadContext(AuthContext);

export const useEmulatorContext = () => useLoadContext(EmulatorContext);

export const useLayoutContext = () => useLoadContext(LayoutContext);

export const useModalContext = () => useLoadContext(ModalContext);
