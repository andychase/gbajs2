import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CheatsModal } from './cheats.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as addCallbackHooks from '../../hooks/emulator/use-add-callbacks.tsx';

import type {
  GBAEmulator,
  ParsedCheats
} from '../../emulator/mgba/mgba-emulator.tsx';

describe('<CheatsModal />', () => {
  it('renders if emulator is null', () => {
    renderWithContext(<CheatsModal />);

    expect(screen.getByRole('form', { name: 'Cheats Form' })).toBeVisible();

    const rawInput = screen.getByLabelText('Raw Libretro Cheats');
    expect(rawInput).toBeInTheDocument();
    expect(rawInput).not.toBeVisible();

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    expect(
      screen.getByRole('button', { name: 'Create new cheat' })
    ).toBeVisible();
  });

  it('renders with empty cheat', () => {
    renderWithContext(<CheatsModal />);

    const rawInput = screen.getByLabelText('Raw Libretro Cheats');
    expect(rawInput).toBeInTheDocument();
    expect(rawInput).not.toBeVisible();

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.getByLabelText('Cheat Code')).toBeVisible();
    expect(screen.getByLabelText('Enabled')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Remove Cheat' })).toBeVisible();
  });

  it('renders existing raw and parsed cheats', async () => {
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        getCurrentCheatsFile: () =>
          new TextEncoder().encode('Some cheat file contents'),
        parseCheatsString: (str) =>
          str && [
            { desc: 'cheat1', code: 'code1', enable: true },
            { desc: 'cheat2', code: 'code2', enable: false }
          ],
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    renderWithContext(<CheatsModal />);

    const rawInput = screen.getByLabelText('Raw Libretro Cheats');
    expect(rawInput).toBeInTheDocument();
    expect(rawInput).not.toBeVisible();

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    const enabledCheckboxes = screen.getAllByRole('switch', {
      name: 'Enabled'
    });

    expect(screen.getByDisplayValue('cheat1')).toBeVisible();
    expect(screen.getByDisplayValue('code1')).toBeVisible();
    expect(enabledCheckboxes[0]).toBeChecked();

    expect(screen.getByDisplayValue('cheat2')).toBeVisible();
    expect(screen.getByDisplayValue('code2')).toBeVisible();
    expect(enabledCheckboxes[1]).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Raw' }));

    expect(screen.getByLabelText('Raw Libretro Cheats')).toBeVisible();
    expect(screen.getByDisplayValue('Some cheat file contents')).toBeVisible();

    expect(screen.getByRole('button', { name: 'Parsed' })).toBeVisible();
  });

  it('adds new cheat', async () => {
    const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');

    renderWithContext(<CheatsModal />);

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    await userEvent.click(
      screen.getByRole('button', { name: 'Create new cheat' })
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    // adding a new cheat should cause the create button to scroll into view fully
    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalledOnce();
    });
  });

  it('removes cheat', async () => {
    renderWithContext(<CheatsModal />);

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Remove Cheat' }));

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('submits parsed cheats', async () => {
    const testCheatsFile = new TextEncoder().encode('Some cheat file contents');
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file: File, cb?: () => void) => cb?.()
    );
    const parsedCheatsToFileSpy: (cheatsList: ParsedCheats[]) => File | null =
      vi.fn(() => new File([testCheatsFile], 'rom1.cheats'));
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');
    const autoLoadCheatsSpy: () => boolean = vi.fn(() => true);
    const syncActionIfEnabledSpy = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        parsedCheatsToFile: parsedCheatsToFileSpy,
        uploadCheats: uploadCheatsSpy,
        autoLoadCheats: autoLoadCheatsSpy,
        getCurrentCheatsFile: () => testCheatsFile,
        parseCheatsString: (str) =>
          str && [{ desc: 'cheat1', code: 'code1', enable: false }],
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<CheatsModal />);

    await userEvent.type(screen.getByLabelText('Name'), '_edited');
    await userEvent.type(screen.getByLabelText('Cheat Code'), '_edited');
    await userEvent.click(screen.getByLabelText('Enabled'));

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(parsedCheatsToFileSpy).toHaveBeenCalledOnce();
    expect(parsedCheatsToFileSpy).toHaveBeenCalledWith([
      {
        desc: 'cheat1_edited',
        code: 'code1_edited',
        enable: true
      }
    ]);
    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(uploadCheatsSpy).toHaveBeenCalledOnce();
    expect(autoLoadCheatsSpy).toHaveBeenCalledOnce();
  });

  it('submits raw cheats', async () => {
    const testCheatsFile = new TextEncoder().encode('Some cheat file contents');
    const uploadCheatsSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file: File, cb?: () => void) => cb?.()
    );
    const getCurrentCheatsFileNameSpy: () => string = vi.fn(
      () => 'rom1.cheats'
    );
    const { useEmulatorContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');
    const { useAddCallbacks: originalCallbacks } = await vi.importActual<
      typeof addCallbackHooks
    >('../../hooks/emulator/use-add-callbacks.tsx');
    const autoLoadCheatsSpy: () => boolean = vi.fn(() => true);
    const syncActionIfEnabledSpy = vi.fn();

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...original(),
      emulator: {
        uploadCheats: uploadCheatsSpy,
        autoLoadCheats: autoLoadCheatsSpy,
        getCurrentCheatsFile: () => testCheatsFile,
        parseCheatsString: (str) =>
          str && [{ desc: 'cheat1', code: 'code1', enable: false }],
        getCurrentCheatsFileName: getCurrentCheatsFileNameSpy,
        getCurrentAutoSaveStatePath: () => null
      } as GBAEmulator
    }));

    vi.spyOn(addCallbackHooks, 'useAddCallbacks').mockImplementation(() => ({
      ...originalCallbacks(),
      syncActionIfEnabled: syncActionIfEnabledSpy
    }));

    renderWithContext(<CheatsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Raw' }));

    await userEvent.type(screen.getByLabelText('Name'), '_edited');
    await userEvent.type(
      screen.getByLabelText('Raw Libretro Cheats'),
      ' (edited)'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(syncActionIfEnabledSpy).toHaveBeenCalledOnce();
    expect(uploadCheatsSpy).toHaveBeenCalledOnce();
    expect(autoLoadCheatsSpy).toHaveBeenCalledOnce();
    expect(getCurrentCheatsFileNameSpy).toHaveBeenCalledOnce();
  });

  it('renders parsed cheats validation errors', async () => {
    renderWithContext(<CheatsModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    // cheat name and cheat code fields have explicit validations
    expect(screen.getAllByText('required')).toHaveLength(2);
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

    renderWithContext(<CheatsModal />);

    // click the close button
    const closeButton = screen.getByText('Close', { selector: 'button' });
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);

    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });
});
