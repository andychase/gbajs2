import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PwaPrompt } from './pwa-prompt.tsx';
import * as publicRomHooks from '../../hooks/use-show-load-public-roms.tsx';

describe('<PwaPrompt />', () => {
  const iOSUserAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';

  beforeEach(() => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      iOSUserAgent
    );
  });

  it('renders prompt', () => {
    render(<PwaPrompt />);

    expect(screen.getByText('Add to Home Screen')).toBeVisible();
  });

  it('does not render prompt if public rom modal should render', () => {
    vi.spyOn(publicRomHooks, 'usePublicRoms').mockReturnValue({
      shouldShowPublicRomModal: true,
      setHasLoadedPublicRoms: vi.fn(),
      romURL: ''
    });

    render(<PwaPrompt />);

    expect(screen.queryByText('Add to Home Screen')).not.toBeInTheDocument();
  });
});
