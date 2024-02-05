import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PwaPrompt } from './pwa-prompt.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

describe('<PwaPrompt />', () => {
  const iOSUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

  beforeEach(() => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(iOSUA);
  });

  it('renders prompt', () => {
    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );

    render(<PwaPrompt />);

    expect(screen.getByText('Add to Home Screen')).toBeVisible();
  });

  it('does not render prompt if tour intro is incomplete', () => {
    render(<PwaPrompt />);

    expect(screen.queryByText('Add to Home Screen')).not.toBeInTheDocument();
  });
});
