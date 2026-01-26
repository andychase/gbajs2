import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './error-boundary.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

const ThrowError = () => {
  throw new Error('A test error');
};

const ThrowEmptyError = () => {
  const e = new Error();
  e.stack = undefined;
  throw e;
};

const ThrowNonErrorObject = () => {
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw 'A test error';
};

describe('<AppErrorBoundary/>', () => {
  it('renders children', () => {
    renderWithContext(
      <AppErrorBoundary>
        <p>Everything is fine</p>
      </AppErrorBoundary>
    );
    expect(screen.getByText('Everything is fine')).toBeVisible();
  });

  it('renders fallback on uncaught error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    });

    renderWithContext(
      <AppErrorBoundary>
        <ThrowError />
        <p>Everything is fine</p>
      </AppErrorBoundary>
    );

    expect(screen.queryByText('Everything is fine')).not.toBeInTheDocument();
    expect(screen.getByText('A test error')).toBeVisible();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('fallbackRender', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    });
  });

  it('renders styled fallback', () => {
    renderWithContext(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>
    );

    expect(screen.getByText('A test error')).toBeVisible();
    // renders header
    expect(screen.getByText('An irrecoverable error occurred')).toBeVisible();
    // renders image
    expect(screen.getByAltText('GameBoy Advance with error icon'));
    // renders font attribution
    expect(screen.getByText('Font by NACreative')).toBeVisible();
    // renders error message
    expect(screen.getByText('A test error')).toBeVisible();
    // renders button steps
    expect(screen.getByText('Copy trace')).toBeVisible();
    expect(screen.getByText('Create issue')).toBeVisible();
    expect(screen.getByText('Dismiss and reset')).toBeVisible();

    expect(screen.getByTestId('fallback-renderer')).toMatchSnapshot();
  });

  it('copies error stack clipboard', async () => {
    const user = userEvent.setup();
    renderWithContext(
      <AppErrorBoundary>
        <ThrowError />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Copy trace')).toBeVisible();

    await user.click(screen.getByText('Copy trace'));

    const copiedText = await window.navigator.clipboard.readText();
    expect(copiedText).toContain('Error: A test error\n    at');
  });

  it('copies error stack clipboard text fallback', async () => {
    const user = userEvent.setup();

    renderWithContext(
      <AppErrorBoundary>
        <ThrowEmptyError />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Copy trace')).toBeVisible();

    await user.click(screen.getByText('Copy trace'));

    const copiedText = await window.navigator.clipboard.readText();
    expect(copiedText).toBe('Error had empty stack');
  });

  it('copies clipboard text fallback', async () => {
    const user = userEvent.setup();

    renderWithContext(
      <AppErrorBoundary>
        <ThrowNonErrorObject />
      </AppErrorBoundary>
    );

    expect(screen.getByText('Copy trace')).toBeVisible();

    await user.click(screen.getByText('Copy trace'));

    const copiedText = await window.navigator.clipboard.readText();
    expect(copiedText).toBe('No stack available');
  });
});
