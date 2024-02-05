import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { gbaServerLocationPlaceholder } from './mocks/handlers.ts';
import { server } from './mocks/server.ts';

// MSW setup
vi.stubEnv('VITE_GBA_SERVER_LOCATION', gbaServerLocationPlaceholder);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterAll(() => server.close());

afterEach(() => {
  localStorage.clear();
  server.resetHandlers();
});
