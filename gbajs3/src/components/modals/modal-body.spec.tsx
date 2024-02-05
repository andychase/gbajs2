import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModalBody } from './modal-body.tsx';

describe('<ModalBody />', () => {
  it('renders children', () => {
    render(<ModalBody>Test Footer Content</ModalBody>);

    expect(screen.getByText('Test Footer Content')).toBeInTheDocument();
  });

  it('container matches snapshot', () => {
    render(<ModalBody>Test Footer Content</ModalBody>);

    expect(screen.getByText('Test Footer Content')).toMatchSnapshot();
  });
});
