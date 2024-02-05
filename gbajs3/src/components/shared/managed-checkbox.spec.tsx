import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManagedCheckbox } from './managed-checkbox.tsx';

const mockRegisterProps = {
  ref: vi.fn(),
  onChange: vi.fn(),
  onBlur: vi.fn(),
  name: 'checkboxName'
};

describe('<ManagedCheckbox />', () => {
  it('renders with provided label', () => {
    render(
      <ManagedCheckbox
        label="Checkbox Label"
        registerProps={mockRegisterProps}
      />
    );

    expect(mockRegisterProps.ref).toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Checkbox Label')).toBeInTheDocument();
  });

  it('applies the provided id to label container', () => {
    render(
      <ManagedCheckbox
        id="customId"
        label="Checkbox Label"
        registerProps={mockRegisterProps}
      />
    );

    expect(screen.getByTestId('managed-checkbox:label')).toHaveAttribute(
      'id',
      'customId'
    );
  });

  it('checks the checkbox based on the watcher prop', () => {
    render(
      <ManagedCheckbox
        label="Checkbox Label"
        registerProps={mockRegisterProps}
        watcher={true}
      />
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does not check the checkbox when watcher prop is false', () => {
    render(
      <ManagedCheckbox
        label="Checkbox Label"
        registerProps={mockRegisterProps}
        watcher={false}
      />
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
