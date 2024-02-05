import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { NavComponent } from './nav-component.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

const defaultProps = {
  title: 'Test Title',
  icon: <div>Test Icon</div>,
  children: <div>Test Children</div>
};

describe('<NavComponent />', () => {
  it('renders with icon and hidden children', () => {
    renderWithContext(<NavComponent {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeVisible();
    expect(screen.getByText('Test Icon')).toBeVisible();
    expect(screen.getByText('Test Children')).not.toBeVisible();
  });

  it('renders expanded on demand', () => {
    renderWithContext(<NavComponent {...defaultProps} $isExpanded />);

    expect(screen.getByText('Test Title')).toBeVisible();
    expect(screen.getByText('Test Icon')).toBeVisible();
    expect(screen.getByText('Test Children')).toBeVisible();
  });

  it('toggles children height on click', async () => {
    renderWithContext(<NavComponent {...defaultProps} />);

    expect(screen.getByText('Test Children')).not.toBeVisible();

    await userEvent.click(screen.getByText('Test Title'));

    // Check if the children are visible
    expect(screen.getByText('Test Children')).toBeVisible();

    await userEvent.click(screen.getByText('Test Title'));

    // Check if the children are not visible
    await waitFor(() =>
      expect(screen.getByText('Test Children')).not.toBeVisible()
    );
  });

  it('applies styles correctly when disabled', async () => {
    renderWithContext(<NavComponent {...defaultProps} $disabled />);

    // click should fail
    await expect(() =>
      userEvent.click(screen.getByText('Test Title'))
    ).rejects.toThrow(/pointer-events: none/);
  });
});
