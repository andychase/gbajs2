import { renderHook } from '@testing-library/react';

import { AllTheProviders } from './providers.tsx';

import type {
  RenderHookOptions,
  RenderHookResult
} from '@testing-library/react';

export function renderHookWithContext<P, R>(
  callback: (props: P) => R,
  renderHookOptions?: RenderHookOptions<P>
): RenderHookResult<R, P> {
  return renderHook(callback, {
    ...renderHookOptions,
    wrapper: AllTheProviders
  });
}
