import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ManagedSwitch } from './managed-switch.tsx';

const mockRegisterProps = {
  ref: vi.fn(),
  onChange: vi.fn(),
  onBlur: vi.fn(),
  name: 'switchName'
};

describe('<ManagedSwitch />', () => {
  it('renders with provided label', () => {
    render(
      <ManagedSwitch label="Switch Label" registerProps={mockRegisterProps} />
    );

    expect(mockRegisterProps.ref).toHaveBeenCalled();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Switch Label')).toBeInTheDocument();
  });

  it('applies the provided id to label container', () => {
    render(
      <ManagedSwitch
        id="customId"
        label="Switch Label"
        registerProps={mockRegisterProps}
      />
    );

    expect(screen.getByTestId('managed-switch:label')).toHaveAttribute(
      'id',
      'customId'
    );
  });

  it('checks the switch based on the watcher prop', () => {
    render(
      <ManagedSwitch
        label="Switch Label"
        registerProps={mockRegisterProps}
        watcher={true}
      />
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does not check the switch when watcher prop is false', () => {
    render(
      <ManagedSwitch
        label="Switch Label"
        registerProps={mockRegisterProps}
        watcher={false}
      />
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
