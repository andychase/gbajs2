import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UploadPublicExternalRomsModal } from './upload-public-external-roms.tsx';
import { testRomLocation } from '../../../test/mocks/handlers.ts';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import * as runGameHooks from '../../hooks/emulator/use-run-game.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<UploadPublicExternalRomsModal />', () => {
  it('uploads rom from external url', async () => {
    const runGameSpy = vi.fn(() => true);
    const onLoadOrDismissSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const {
      useEmulatorContext: originalEmulator,
      useModalContext: originalModal
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        filePaths: () => ({
          gamePath: '/games'
        })
      } as GBAEmulator
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    renderWithContext(
      <UploadPublicExternalRomsModal
        url={new URL(`${testRomLocation}/good_rom.gba`)}
        onLoadOrDismiss={onLoadOrDismissSpy}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'View Full URL' })
    );

    const romLink = screen.getByRole('link');
    expect(romLink).toBeInTheDocument();
    expect(romLink).toHaveAttribute('href', `${testRomLocation}/good_rom.gba`);

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const loadingSpinner = screen.getByText(/Loading rom from url:/);
    expect(loadingSpinner).toBeVisible();

    await waitForElementToBeRemoved(
      screen.queryByText(/Loading rom from url:/)
    );

    expect(uploadRomSpy).toHaveBeenCalledOnce();

    expect(runGameSpy).toHaveBeenCalledOnce();
    expect(runGameSpy).toHaveBeenCalledWith('/games/good_rom.gba');

    expect(onLoadOrDismissSpy).toHaveBeenCalledOnce();
    expect(onLoadOrDismissSpy).toHaveBeenCalledWith('loaded');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);

    expect(await screen.findByText('Upload complete!')).toBeVisible();
  });

  it('renders external rom error', async () => {
    const runGameSpy = vi.fn(() => true);
    const onLoadOrDismissSpy = vi.fn();
    const uploadRomSpy: (file: File, cb?: () => void) => void = vi.fn(
      (_file, cb) => cb && cb()
    );

    const { useEmulatorContext: originalEmulator } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        uploadRom: uploadRomSpy,
        filePaths: () => ({
          gamePath: '/games'
        })
      } as GBAEmulator
    }));

    vi.spyOn(runGameHooks, 'useRunGame').mockReturnValue(runGameSpy);

    renderWithContext(
      <UploadPublicExternalRomsModal
        url={new URL(`${testRomLocation}/bad_rom.gba`)}
        onLoadOrDismiss={onLoadOrDismissSpy}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    const loadingSpinner = screen.getByText(/Loading rom from url:/);
    expect(loadingSpinner).toBeVisible();

    await waitForElementToBeRemoved(
      screen.queryByText(/Loading rom from url:/)
    );

    expect(uploadRomSpy).not.toHaveBeenCalled();
    expect(runGameSpy).not.toHaveBeenCalled();

    expect(
      await screen.findByText('Loading rom from URL has failed')
    ).toBeVisible();

    // click the close button
    await userEvent.click(
      screen.getByText("Don't ask again", { selector: 'button' })
    );

    // if dismissed here, should mark rom as skipped with error
    expect(onLoadOrDismissSpy).toHaveBeenCalledOnce();
    expect(onLoadOrDismissSpy).toHaveBeenCalledWith('skipped-error');
  });

  it('temporarily dismisses modal', async () => {
    const onLoadOrDismissSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(
      <UploadPublicExternalRomsModal
        url={new URL(`${testRomLocation}/good_rom.gba`)}
        onLoadOrDismiss={onLoadOrDismissSpy}
      />
    );

    // click the modal dismiss button
    const modalDismissButton = screen.getByRole('button', {
      name: 'Close'
    });
    expect(modalDismissButton).toBeInTheDocument();
    await userEvent.click(modalDismissButton);

    expect(onLoadOrDismissSpy).toHaveBeenCalledOnce();
    expect(onLoadOrDismissSpy).toHaveBeenCalledWith('temporarily-dismissed');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('closes modal using the permanently dismiss button', async () => {
    const onLoadOrDismissSpy = vi.fn();
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    renderWithContext(
      <UploadPublicExternalRomsModal
        url={new URL(`${testRomLocation}/good_rom.gba`)}
        onLoadOrDismiss={onLoadOrDismissSpy}
      />
    );

    // click the close button
    const permanentlyDismissButton = screen.getByText("Don't ask again", {
      selector: 'button'
    });
    expect(permanentlyDismissButton).toBeInTheDocument();
    await userEvent.click(permanentlyDismissButton);

    // marks rom as skipped
    expect(onLoadOrDismissSpy).toHaveBeenCalledOnce();
    expect(onLoadOrDismissSpy).toHaveBeenCalledWith('skipped');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });
});
