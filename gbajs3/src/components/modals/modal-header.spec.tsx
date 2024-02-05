import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModalHeader } from './modal-header.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';

describe('<ModalHeader />', () => {
  it('renders with exit indicator', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(<ModalHeader title="Test Modal" />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();

    // click the close button
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders without exit indicator', () => {
    renderWithContext(
      <ModalHeader title="Test Modal" showExitIndicator={false} />
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });
});
