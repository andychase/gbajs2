import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModalFooter } from './modal-footer.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

describe('<ModalFooter />', () => {
  it('renders children', () => {
    renderWithContext(<ModalFooter>Test Footer Content</ModalFooter>);

    expect(screen.getByText('Test Footer Content')).toBeInTheDocument();
  });

  it('container matches snapshot', () => {
    renderWithContext(<ModalFooter>Test Footer Content</ModalFooter>);

    expect(screen.getByTestId(`modal-footer:wrapper`)).toMatchSnapshot();
  });
});
