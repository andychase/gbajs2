import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonBase } from './custom-button-base.tsx';

describe('<ButtonBase />', () => {
  it('renders without children', () => {
    render(<ButtonBase />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with children', () => {
    render(<ButtonBase>Test Button</ButtonBase>);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(<ButtonBase className="custom-class" />);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('triggers onClick handler when clicked', async () => {
    const onClickMock = vi.fn();

    render(<ButtonBase onClick={onClickMock} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClickMock).toHaveBeenCalledOnce();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<ButtonBase ref={ref} />);

    expect(ref.current).toBeInTheDocument();
  });
});
