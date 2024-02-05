import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { MinusSquare, PlusSquare, CloseSquare } from './action-box-icons.tsx';

const components = [
  ['minus', MinusSquare],
  ['plus', PlusSquare],
  ['close', CloseSquare]
];

it.each(components)('%s: matches snapshot', (className, Icon) => {
  render(<Icon />);

  expect(screen.getByTestId(`action-box:${className}`)).toMatchSnapshot();
});
