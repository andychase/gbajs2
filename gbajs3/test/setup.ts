import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { gbaServerLocationPlaceholder } from './mocks/handlers.ts';
import { server } from './mocks/server.ts';

// see: https://github.com/mswjs/msw/issues/2166#issuecomment-2363457424
import 'blob-polyfill';

// MSW setup
vi.stubEnv('VITE_GBA_SERVER_LOCATION', gbaServerLocationPlaceholder);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

afterAll(() => server.close());

afterEach(() => {
  localStorage.clear();
  server.resetHandlers();
});
