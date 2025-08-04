import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SaveStatesModal } from './save-states.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';
import * as useFileStatHooks from '../../hooks/emulator/use-file-stat.tsx';
import { saveStateSlotsLocalStorageKey } from '../controls/consts.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<SaveStatesModal />', () => {
  it('renders if emulator is null', () => {
    renderWithContext(<SaveStatesModal />);

    expect(screen.getByLabelText('Current Save State Slot')).toBeVisible();
    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('No save states')).toBeVisible();
  });

  it('renders with save states from current game and current slot', async () => {
    const getSaveStateSpy: (saveStateName: string) => Uint8Array = vi.fn(
      () => new Uint8Array()
    );

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listCurrentSaveStates: () => ['rom0.ss0', 'rom0.ss1'],
        getCurrentGameName: () => 'rom0.gba',
        getSaveState: getSaveStateSpy,
        getAutoSaveState: () => null,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    localStorage.setItem(saveStateSlotsLocalStorageKey, '{"rom0.gba":2}');

    renderWithContext(<SaveStatesModal />);

    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'rom0.ss0' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'rom0.ss1' })
    ).toBeInTheDocument();
    expect(getSaveStateSpy).toHaveBeenCalledTimes(2);
  });

  it('renders with auto save state', async () => {
    const getSaveStateSpy: (saveStateName: string) => Uint8Array = vi.fn(
      () => new Uint8Array()
    );

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listCurrentSaveStates: () => ['rom0.ss0'],
        getCurrentGameName: () => 'rom0.gba',
        getSaveState: getSaveStateSpy,
        getAutoSaveState: () => ({
          autoSaveStateName: 'rom0_auto.ss',
          data: new Uint8Array([1, 2, 3])
        }),
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);
    expect(
      screen.getByRole('button', { name: 'rom0_auto.ss' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'rom0.ss0' })
    ).toBeInTheDocument();
    expect(getSaveStateSpy).toHaveBeenCalledTimes(2);
  });

  it('updates current slot', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        getCurrentGameName: () => 'some_rom.gba',
        getAutoSaveState: () => null,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.type(screen.getByLabelText('Current Save State Slot'), '5');

    expect(setItemSpy).toHaveBeenCalledWith(
      saveStateSlotsLocalStorageKey,
      '{"some_rom.gba":5}'
    );
  });

  it('creates saves states', async () => {
    const listCurrentSaveStatesSpy = vi
      .fn()
      .mockImplementationOnce(() => ['rom0.ss0'])
      .mockImplementationOnce(() => ['rom0.ss0', 'rom0.ss1']);
    const createSaveStateSpy: (s: number) => boolean = vi.fn(() => true);
    const getSaveStateSpy = vi.fn(() => new Uint8Array());
    const syncActionIfEnabledSpy = vi.fn();

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        getCurrentGameName: () => 'rom0.gba',
        listCurrentSaveStates: listCurrentSaveStatesSpy as () => string[],
        getSaveState: getSaveStateSpy as (saveStateName: string) => Uint8Array,
        createSaveState: createSaveStateSpy,
        getAutoSaveState: () => null,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<SaveStatesModal />);

    // clear calls from initial render
    listCurrentSaveStatesSpy.mockClear();
    getSaveStateSpy.mockClear();

    await userEvent.click(
      screen.getByRole('button', { name: 'Create new save state' })
    );

    expect(createSaveStateSpy).toHaveBeenCalledOnce();
    expect(createSaveStateSpy).toHaveBeenCalledWith(1);
    expect(listCurrentSaveStatesSpy).toHaveBeenCalledOnce();
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(getSaveStateSpy).toHaveBeenCalledTimes(2);
  });

  it('renders error if creating save state fails', async () => {
    const getSaveStateSpy = vi.fn(() => new Uint8Array());
    const createSaveState: (slot: number) => boolean = () => false;
    // must be stable
    const emu = {
      listCurrentSaveStates: () => ['rom0.ss0'],
      getCurrentGameName: () => 'rom0.gba',
      getSaveState: getSaveStateSpy as (saveStateName: string) => Uint8Array,
      createSaveState: createSaveState,
      getAutoSaveState: () => null,
      getCurrentAutoSaveStatePath: () => null
    } as GBAEmulator;

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: emu
    }));

    renderWithContext(<SaveStatesModal />);

    getSaveStateSpy.mockClear();

    await userEvent.click(
      screen.getByRole('button', { name: 'Create new save state' })
    );

    expect(screen.getByText('Failed to create save state')).toBeVisible();
    expect(getSaveStateSpy).not.toHaveBeenCalled();
  });

  it('deletes saves states', async () => {
    const deleteSaveStateSpy: (s: number) => void = vi.fn();
    const getSaveStateSpy = vi.fn(() => new Uint8Array());
    const listCurrentSaveStatesSpy = vi
      .fn()
      .mockImplementationOnce(() => ['rom0.ss0', 'rom0.ss1'])
      .mockImplementationOnce(() => ['rom0.ss0']);
    const syncActionIfEnabledSpy = vi.fn();
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => {
      return {
        ...original(),
        emulator: {
          getCurrentGameName: () => 'rom0.gba',
          listCurrentSaveStates: listCurrentSaveStatesSpy as () => string[],
          getSaveState: getSaveStateSpy as (
            saveStateName: string
          ) => Uint8Array,
          deleteSaveState: deleteSaveStateSpy,
          getAutoSaveState: () => null,
          getCurrentAutoSaveStatePath: () => null
        } as GBAEmulator
      };
    });

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<SaveStatesModal />);

    // clear calls from initial render
    listCurrentSaveStatesSpy.mockClear();
    getSaveStateSpy.mockClear();

    await userEvent.click(screen.getByLabelText('Delete rom0.ss1'));

    expect(deleteSaveStateSpy).toHaveBeenCalledOnce();
    expect(deleteSaveStateSpy).toHaveBeenCalledWith(1);
    expect(listCurrentSaveStatesSpy).toHaveBeenCalledOnce();
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(getSaveStateSpy).toHaveBeenCalledTimes(1);
  });

  it('deletes auto save state', async () => {
    const deleteFileSpy: (p: string) => void = vi.fn();
    const triggerSpy = vi.fn();

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    const { useFileStat: originalFileStat } = await vi.importActual<
      typeof useFileStatHooks
    >('../../hooks/emulator/use-file-stat.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        listCurrentSaveStates: (): string[] => [],
        getCurrentGameName: () => 'rom0.gba',
        getAutoSaveState: () => ({
          autoSaveStateName: 'rom0_auto.ss',
          data: new Uint8Array([1, 2, 3])
        }),
        deleteFile: deleteFileSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(useFileStatHooks, 'useFileStat').mockImplementation(() => ({
      ...originalFileStat(),
      trigger: triggerSpy
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(screen.getByLabelText('Delete rom0_auto.ss'));

    expect(deleteFileSpy).toHaveBeenCalledOnce();
    expect(deleteFileSpy).toHaveBeenCalledWith('rom0_auto.ss');
    expect(triggerSpy).toHaveBeenCalledOnce();
  });

  it('loads save state', async () => {
    const loadSaveStateSpy: (_: number) => boolean = vi.fn(() => true);
    const getSaveStateSpy = vi.fn(() => new Uint8Array());
    // must be stable
    const emu = {
      listCurrentSaveStates: () => ['some_rom.ss1'],
      getCurrentGameName: () => 'some_rom.gba',
      loadSaveState: loadSaveStateSpy,
      getSaveState: getSaveStateSpy as (saveStateName: string) => Uint8Array,
      getAutoSaveState: () => null,
      getCurrentAutoSaveStatePath: () => null
    } as GBAEmulator;

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: emu
    }));

    renderWithContext(<SaveStatesModal />);

    getSaveStateSpy.mockClear(); // clear calls from initial render

    await userEvent.click(screen.getByRole('button', { name: 'some_rom.ss1' }));

    expect(loadSaveStateSpy).toHaveBeenCalledOnce();
    expect(loadSaveStateSpy).toHaveBeenCalledWith(1);
    expect(getSaveStateSpy).not.toHaveBeenCalled();
  });

  it('renders error if loading save state fails', async () => {
    const getSaveState: (saveStateName: string) => Uint8Array = () =>
      new Uint8Array();
    const loadSaveState: (slot: number) => boolean = () => false;

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listCurrentSaveStates: () => ['rom0.ss0'],
        getCurrentGameName: () => 'rom0.gba',
        getSaveState: getSaveState,
        loadSaveState: loadSaveState,
        getAutoSaveState: () => null,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(screen.getByRole('button', { name: 'rom0.ss0' }));

    expect(screen.getByText('Failed to load save state')).toBeVisible();
  });

  it('opens and closes save state previews', async () => {
    const getSaveState: (saveStateName: string) => Uint8Array = () =>
      new Uint8Array([1, 2, 3]);

    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listCurrentSaveStates: () => ['rom0.ss0', 'rom0.ss1'],
        getCurrentGameName: () => 'rom0.gba',
        getSaveState: getSaveState,
        getAutoSaveState: () => null,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    await userEvent.click(
      screen.getByRole('button', { name: 'View rom0.ss0' })
    );

    expect(screen.getByAltText('rom0.ss0 Preview')).toBeVisible();
    expect(screen.getByAltText('rom0.ss1 Preview')).not.toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'View rom0.ss1' })
    );

    await waitFor(() =>
      expect(screen.getByAltText('rom0.ss0 Preview')).not.toBeVisible()
    );
    expect(screen.getByAltText('rom0.ss1 Preview')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Close rom0.ss1' })
    );

    expect(screen.getByAltText('rom0.ss0 Preview')).not.toBeVisible();
    await waitFor(() =>
      expect(screen.getByAltText('rom0.ss1 Preview')).not.toBeVisible()
    );
  });

  it('opens and closes auto save state preview', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        listCurrentSaveStates: (): string[] => [],
        getCurrentGameName: () => 'rom0.gba',
        getAutoSaveState: () => ({
          autoSaveStateName: 'rom0_auto.ss',
          data: new Uint8Array([1, 2, 3])
        }),
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<SaveStatesModal />);

    expect(screen.getByAltText('rom0_auto.ss Preview')).not.toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'View rom0_auto.ss' })
    );

    expect(screen.getByAltText('rom0_auto.ss Preview')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Close rom0_auto.ss' })
    );

    await waitFor(() =>
      expect(screen.getByAltText('rom0_auto.ss Preview')).not.toBeVisible()
    );
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
        'Use this input to manually update the current save state slot in use.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this input to manually update the current save state slot in use.'
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

    // dismiss the popper interface
    await userEvent.click(screen.getByText('Last'));
  });
});
