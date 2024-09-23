import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PacmanIndicator, LoadingIndicator } from './loading-indicator.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

describe('<PacmanIndicator />', () => {
  it('renders pacman indicator with additional props', () => {
    renderWithContext(
      <PacmanIndicator size={50} data-testid="pacman-indicator" />
    );

    expect(screen.getByTestId('pacman-indicator')).toMatchSnapshot();
  });
});

describe('<LoadingIndicator />', () => {
  it('renders indicator when isLoading is true', () => {
    renderWithContext(
      <LoadingIndicator
        isLoading
        loadingCopy="Loading..."
        currentName="Test"
        indicator={<PacmanIndicator data-testid="pacman-indicator" />}
      >
        <div>Child Content</div>
      </LoadingIndicator>
    );

    expect(screen.getByText(/Loading.../)).toBeInTheDocument();
    expect(screen.getByText(/Test/)).toBeInTheDocument();
    expect(screen.getByTestId('pacman-indicator')).toBeInTheDocument();
  });

  it('renders children when isLoading is false', () => {
    renderWithContext(
      <LoadingIndicator
        isLoading={false}
        loadingCopy="Loading..."
        currentName="Test"
        indicator={<PacmanIndicator data-testid="pacman-indicator" />}
      >
        <div>Child Content</div>
      </LoadingIndicator>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
    expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
    expect(screen.queryByTestId('pacman-indicator')).not.toBeInTheDocument();
  });
});
