import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorWithIcon } from './error-with-icon.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

describe('<ErrorWithIcon />', () => {
  it('renders with text and icon', () => {
    const testIcon = <div data-testid="test-icon" />;
    renderWithContext(<ErrorWithIcon icon={testIcon} text="Error message" />);

    expect(screen.getByTestId('error-with-icon')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with additional className', () => {
    renderWithContext(
      <ErrorWithIcon
        icon={<div />}
        text="Error message"
        className="custom-class"
      />
    );

    expect(screen.getByTestId('error-with-icon')).toHaveClass('custom-class');
  });
});
