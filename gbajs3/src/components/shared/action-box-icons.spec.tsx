import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { MinusSquare, PlusSquare, CloseSquare } from './action-box-icons.tsx';

import type { SvgIconProps } from '@mui/material';
import type { JSX } from 'react';

const components: [string, (props: SvgIconProps) => JSX.Element][] = [
  ['minus', MinusSquare],
  ['plus', PlusSquare],
  ['close', CloseSquare]
];

it.each(components)('%s: matches snapshot', (className, Icon) => {
  render(<Icon />);

  expect(screen.getByTestId(`action-box:${className}`)).toMatchSnapshot();
});
