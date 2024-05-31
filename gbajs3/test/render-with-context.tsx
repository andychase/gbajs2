import { render } from '@testing-library/react';

import { AllTheProviders } from './providers.tsx';

import type { ReactNode } from 'react';

export const renderWithContext = (testNode: ReactNode) => {
  return render(<AllTheProviders>{testNode}</AllTheProviders>);
};
