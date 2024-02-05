import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ReactModal from 'react-modal';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ModalContainer } from './modal-container.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';

import type { GBAEmulator } from '../../emulator/mgba/mgba-emulator.tsx';

describe('<ModalContainer />', () => {
  beforeAll(() => {
    ReactModal.setAppElement(document.createElement('div'));
  });

  it('renders children if modal is open', async () => {
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      isModalOpen: true,
      modalContent: <p>Some modal content</p>
    }));

    renderWithContext(<ModalContainer />);

    expect(screen.getByText('Some modal content')).toBeVisible();
  });

  it('does not render children if nodal is not open', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...original(),
      isModalOpen: false,
      setIsModalOpen: setIsModalOpenSpy,
      modalContent: <p>Some modal content</p>
    }));

    renderWithContext(<ModalContainer />);

    expect(screen.queryByText('Some modal content')).not.toBeInTheDocument();
  });

  it('closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const { useModalContext: originalModal } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy,
      isModalOpen: true,
      modalContent: <p>Some modal content</p>
    }));

    renderWithContext(<ModalContainer />);

    await userEvent.keyboard('{Escape}');

    expect(setIsModalOpenSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('disables keyboard input after open', async () => {
    const disableKeyboardInputSpy: () => void = vi.fn();
    const {
      useModalContext: originalModal,
      useEmulatorContext: originalEmulator
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      isModalOpen: true,
      modalContent: <p>Some modal content</p>
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        disableKeyboardInput: disableKeyboardInputSpy
      } as GBAEmulator
    }));

    renderWithContext(<ModalContainer />);

    expect(disableKeyboardInputSpy).toHaveBeenCalledOnce();
  });

  it('enables keyboard input after close', async () => {
    const enableKeyboardInputSpy: () => void = vi.fn();
    const {
      useModalContext: originalModal,
      useEmulatorContext: originalEmulator
    } = await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    // mock once so the component re-renders with false for isModalOpen
    vi.spyOn(contextHooks, 'useModalContext').mockImplementationOnce(() => ({
      ...originalModal(),
      isModalOpen: true,
      modalContent: <p>Some modal content</p>
    }));

    vi.spyOn(contextHooks, 'useEmulatorContext').mockImplementation(() => ({
      ...originalEmulator(),
      emulator: {
        enableKeyboardInput: enableKeyboardInputSpy
      } as GBAEmulator
    }));

    renderWithContext(<ModalContainer />);

    await waitFor(() => expect(enableKeyboardInputSpy).toHaveBeenCalledOnce());
  });
});
