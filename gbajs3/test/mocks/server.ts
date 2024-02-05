import { setupServer } from 'msw/node';

import { handlers } from './handlers.ts';

// Configures a Service Worker with the given request handlers.
export const server = setupServer(...handlers);
