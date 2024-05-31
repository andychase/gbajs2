import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { KeyBindingsForm } from './key-bindings-form.tsx';
import { renderWithContext } from '../../../../test/render-with-context.tsx';
import { emulatorKeyBindingsLocalStorageKey } from '../../../context/emulator/consts.ts';
import * as contextHooks from '../../../hooks/context.tsx';

import type {
  GBAEmulator,
  KeyBinding
} from '../../../emulator/mgba/mgba-emulator.tsx';

describe('<KeyBindingsForm />', () => {
  it('renders if emulator is null', () => {
    renderWithContext(<KeyBindingsForm id="testId" />);

    expect(screen.getByRole('form', { name: 'Key Bindings Form' }));
  });

  it('renders form with provided id', () => {
    renderWithContext(<KeyBindingsForm id="testId" />);

    expect(
      screen.getByRole('form', { name: 'Key Bindings Form' })
    ).toHaveAttribute('id', 'testId');
  });

  it('renders with default keybindings', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        defaultKeyBindings: () => [
          { gbaInput: 'A', key: 'X', location: 0 },
          { gbaInput: 'B', key: 'Z', location: 0 }
        ]
      } as GBAEmulator
    }));

    renderWithContext(<KeyBindingsForm id="testId" />);

    expect(screen.getByLabelText('A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('X')).toBeInTheDocument();

    expect(screen.getByLabelText('B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Z')).toBeInTheDocument();
  });

  it('renders form validation errors', async () => {
    const errorPostfix = ' is reserved for accessibility requirements';
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        defaultKeyBindings: () => [
          { gbaInput: 'A', key: 'X', location: 0 },
          // users are no longer able to naturally type tab due to form focus
          { gbaInput: 'B', key: 'Tab', location: 0 }
        ]
      } as GBAEmulator
    }));

    renderWithContext(
      <>
        <KeyBindingsForm id="testId" />{' '}
        <button form="testId" type="submit">
          submit
        </button>
      </>
    );

    const submitButton = screen.getByRole('button', { name: 'submit' });

    await userEvent.type(screen.getByLabelText('A'), ' ');

    await userEvent.click(submitButton);

    expect(screen.getByText('Space' + errorPostfix)).toBeVisible();
    expect(screen.getByText('Tab' + errorPostfix)).toBeVisible();
  });

  it('form values can be changed and properly persisted', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const remapBindingsSpy: (keyBindings: KeyBinding[]) => void = vi.fn();
    const {
      useEmulatorContext: originalEmulator,
      useRunningContext: originalRunning
    } = await vi.importActual<typeof contextHooks>(
      '../../../hooks/context.tsx'
    );

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        defaultKeyBindings: () => [
          { gbaInput: 'A', key: 'X', location: 0 },
          { gbaInput: 'B', key: 'Z', location: 0 }
        ],
        remapKeyBindings: remapBindingsSpy
      } as GBAEmulator,
      isEmulatorRunning: true
    }));

    vi.spyOn(contextHooks, 'useRunningContext').mockImplementation(() => ({
      ...originalRunning(),
      isRunning: true
    }));

    renderWithContext(
      <>
        <KeyBindingsForm id="testId" />{' '}
        <button form="testId" type="submit">
          submit
        </button>
      </>
    );

    const submitButton = screen.getByRole('button', { name: 'submit' });

    await userEvent.type(screen.getByLabelText('A'), 'T');
    await userEvent.type(screen.getByLabelText('B'), '{delete}');

    await userEvent.click(submitButton);

    expect(setItemSpy).toHaveBeenCalledWith(
      emulatorKeyBindingsLocalStorageKey,
      '[{"gbaInput":"A","key":"T","location":0},{"gbaInput":"B","key":"Delete","location":0}]'
    );
    expect(remapBindingsSpy).toHaveBeenCalledWith([
      { gbaInput: 'A', key: 'T', location: 0 },
      { gbaInput: 'B', key: 'Delete', location: 0 }
    ]);
  });

  it('does not accept tab keys', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        defaultKeyBindings: () => [{ gbaInput: 'A', key: 'X', location: 0 }]
      } as GBAEmulator
    }));

    renderWithContext(
      <>
        <KeyBindingsForm id="testId" />
      </>
    );

    await userEvent.type(screen.getByLabelText('A'), '{tab}');

    expect(screen.getByDisplayValue('X')).toBeInTheDocument();
  });

  it('renders initial values from storage', () => {
    localStorage.setItem(
      emulatorKeyBindingsLocalStorageKey,
      '[{ "gbaInput": "L", "key": "A", "location": 0 },{ "gbaInput": "R", "key": "S", "location": 0 }]'
    );

    renderWithContext(<KeyBindingsForm id="testId" />);

    expect(screen.getByLabelText('L')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();

    expect(screen.getByLabelText('R')).toBeInTheDocument();
    expect(screen.getByDisplayValue('S')).toBeInTheDocument();
  });
});
