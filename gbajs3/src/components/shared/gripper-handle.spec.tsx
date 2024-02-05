import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { GripperHandle } from './gripper-handle.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';

const variations = [
  [undefined, '0'],
  ['topLeft', '-45'],
  ['topRight', '45'],
  ['bottomLeft', '45'],
  ['bottomRight', '-45']
] as const;

it.each(variations)(
  'renders with appropriate css transform variation: %s',
  (variation, expected) => {
    renderWithContext(<GripperHandle variation={variation} />);

    expect(screen.getByTestId('gripper-handle')).toHaveStyle(
      `transform: rotate(${expected}deg)`
    );
  }
);
