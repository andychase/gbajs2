import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SaveStatesModal } from './save-states.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { saveStateSlotLocalStorageKey } from '../controls/consts.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<SaveStatesModal />', () => {
  it('renders if emulator is null', () => {
    renderWithContext(<SaveStatesModal />);

    expect(screen.getByLabelText('Current Save State Slot')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Update Slot' })).toBeVisible();
    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('No save states')).toBeVisible();
  });

  it('renders with save states and current slot', async () => {
    localStorage.setItem(saveStateSlotLocalStorageKey, '2');

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listSaveStates: () => ['rom0.ss0', 'rom1.ss1']
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'rom0.ss0' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'rom1.ss1' })
    ).toBeInTheDocument();
  });

  it('submits current slot', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderWithContext(<SaveStatesModal />);

    await userEvent.type(screen.getByLabelText('Current Save State Slot'), '5');

    await userEvent.click(screen.getByRole('button', { name: 'Update Slot' }));

    expect(setItemSpy).toHaveBeenCalledWith(saveStateSlotLocalStorageKey, '5');
  });

  it('creates saves states', async () => {
    const listSaveStatesSpy = vi.fn(() => ['rom0.ss0']);
    const createSaveStateSpy: (s: number) => boolean = vi.fn(() => true);
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listSaveStates: listSaveStatesSpy as () => string[],
        createSaveState: createSaveStateSpy
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    listSaveStatesSpy.mockClear(); // clear calls from initial render

    await userEvent.click(
      screen.getByRole('button', { name: 'Create new save state' })
    );

    expect(createSaveStateSpy).toHaveBeenCalledOnce();
    expect(createSaveStateSpy).toHaveBeenCalledWith(1);
    expect(listSaveStatesSpy).toHaveBeenCalledOnce();
  });

  it('renders error if creating save state fails', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listSaveStates: () => ['rom0.ss0'],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createSaveState: (_) => false
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Create new save state' })
    );

    expect(screen.getByText('Failed to create save state')).toBeVisible();
  });

  it('deletes saves states', async () => {
    const deleteSaveStateSpy: (s: number) => void = vi.fn();
    const listSaveStatesSpy = vi.fn(() => ['rom0.ss0', 'rom1.ss1']);
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          listSaveStates: listSaveStatesSpy as () => string[],
          deleteSaveState: deleteSaveStateSpy
        } as GBAEmulator
      };
    });

    renderWithContext(<SaveStatesModal />);

    listSaveStatesSpy.mockClear(); // clear calls from initial render

    await userEvent.click(screen.getByLabelText('Delete rom1.ss1'));

    expect(deleteSaveStateSpy).toHaveBeenCalledOnce();
    expect(deleteSaveStateSpy).toHaveBeenCalledWith(1);
    expect(listSaveStatesSpy).toHaveBeenCalledOnce();
  });

  it('loads save state', async () => {
    const loadSaveStateSpy: (_: number) => boolean = vi.fn(() => true);
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listSaveStates: () => ['some_rom.ss1'],
        loadSaveState: loadSaveStateSpy
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'some_rom.ss1' }));

    expect(loadSaveStateSpy).toHaveBeenCalledOnce();
    expect(loadSaveStateSpy).toHaveBeenCalledWith(1);
  });

  it('renders error if loading save state fails', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listSaveStates: () => ['rom0.ss0'],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        loadSaveState: (_) => false
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'rom0.ss0' }));

    expect(screen.getByText('Failed to load save state')).toBeVisible();
  });

  it('renders form validations', async () => {
    renderWithContext(<SaveStatesModal />);

    const currentSlot = screen.getByLabelText('Current Save State Slot');

    expect(currentSlot).toBeVisible();

    await userEvent.type(currentSlot, '{backspace}');

    await userEvent.click(screen.getByRole('button', { name: 'Update Slot' }));

    expect(screen.getByText('Slot is required')).toBeVisible();

    await userEvent.type(currentSlot, '-1');

    expect(await screen.findByText('Slot must be >= 0')).toBeVisible();
  });

  it('closes modal using the close button', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(<SaveStatesModal />);

    // click the close button
    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders tour steps', async () => {
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      isModalOpen: true
    }));

    localStorage.setItem(
      productTourLocalStorageKey,
      '{"hasCompletedProductTourIntro":"finished"}'
    );

    renderWithContext(<SaveStatesModal />);

    expect(
      await screen.findByText(
        'Use this input and button to manually update the current save state slot in use.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this input and button to manually update the current save state slot in use.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        'Tap a row to load a save state, or use the trash can icon to delete a save state.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        (_, element) =>
          element?.nodeName === 'P' &&
          element?.textContent ===
            'Use the plus button to add a new save state. This will automatically increase the current save state number!'
      )
    ).toBeVisible();
  });
});
