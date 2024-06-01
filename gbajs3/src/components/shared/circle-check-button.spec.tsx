import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CircleCheckButton } from './circle-check-button.tsx';

describe('<CircleCheckButton />', () => {
  it('matches snapshot when clicked', async () => {
    render(<CircleCheckButton copy="Submit" />);

    expect(screen.getByRole('button')).toMatchSnapshot();

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toMatchSnapshot();
  });

  it('calls onClick when clicked', async () => {
    const onClickSpy = vi.fn();

    render(<CircleCheckButton copy="Submit" onClick={onClickSpy} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClickSpy).toHaveBeenCalledOnce();
  });

  it('hides copy when rendering animation', async () => {
    render(<CircleCheckButton copy="Submit" msDuration={100} />);
    // renders copy
    expect(screen.getByText('Submit')).toBeVisible();

    await userEvent.click(screen.getByRole('button'));

    // renders svg animation
    expect(screen.queryByText('Submit')).not.toBeVisible();
    expect(screen.getByRole('graphics-symbol')).toBeVisible();

    // renders copy after animation has finished
    await waitFor(() => expect(screen.getByText('Submit')).toBeVisible());
  });
});
