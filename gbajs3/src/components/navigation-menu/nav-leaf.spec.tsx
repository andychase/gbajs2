import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NavLeaf } from './nav-leaf.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

describe('<NavLeaf />', () => {
  const defaultProps = {
    title: 'Test Title',
    icon: <span>Icon</span>
  };

  it('renders as abutton with title and icon', () => {
    renderWithContext(<NavLeaf {...defaultProps} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('executes onClick if rendering as a button', async () => {
    const onClickMock = vi.fn();

    renderWithContext(<NavLeaf {...defaultProps} onClick={onClickMock} />);

    const button = screen.getByText('Test Title');
    expect(button).toBeInTheDocument();

    await userEvent.click(button);

    expect(onClickMock).toHaveBeenCalledOnce();
  });

  it('does not run onClick if disabled', async () => {
    const onClickMock = vi.fn();

    renderWithContext(
      <NavLeaf {...defaultProps} onClick={onClickMock} $disabled />
    );

    const button = screen.getByText('Test Title');
    expect(button).toBeInTheDocument();

    // click should fail
    await expect(() => userEvent.click(button)).rejects.toThrow(
      /pointer-events: none/
    );
    // mock should never be called
    expect(onClickMock).not.toHaveBeenCalled();
  });

  it('renders as link if given', () => {
    const link = 'https://example.com';
    renderWithContext(<NavLeaf {...defaultProps} $link={link} />);

    const navLink = screen.getByRole('link');
    expect(navLink).toBeInTheDocument();
    expect(navLink).toHaveAttribute('href', link);
    expect(navLink).toHaveAttribute('target', '_blank');
  });

  it('does not allow link click if disabled', async () => {
    const link = 'https://example.com';
    renderWithContext(<NavLeaf {...defaultProps} $link={link} $disabled />);

    const button = screen.getByText('Test Title');
    expect(button).toBeInTheDocument();

    // click should fail
    await expect(() => userEvent.click(button)).rejects.toThrow(
      /pointer-events: none/
    );
  });

  it('renders without extra padding by default', () => {
    renderWithContext(<NavLeaf {...defaultProps} />);

    expect(screen.getByRole('button')).toHaveStyle('padding: 0.5rem 0.5rem');

    const link = 'https://example.com';
    renderWithContext(<NavLeaf {...defaultProps} $link={link} />);

    expect(screen.getByRole('link')).toHaveStyle('padding: 0.5rem 0.5rem');
  });

  it('renders with extra padding if requested', () => {
    renderWithContext(<NavLeaf {...defaultProps} $withPadding />);

    expect(screen.getByRole('button')).toHaveStyle('padding: 0.5rem 1rem');

    const link = 'https://example.com';
    renderWithContext(<NavLeaf {...defaultProps} $link={link} $withPadding />);

    expect(screen.getByRole('link')).toHaveStyle('padding: 0.5rem 1rem');
  });
});
