import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ControlsModal } from './controls.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

describe('<ControlsModal />', () => {
  it('switches controls tabs', async () => {
    renderWithContext(<ControlsModal />);

    // virtual controls is selected by default
    expect(
      screen.getByRole('tab', { name: 'Virtual Controls', selected: true })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Profiles', selected: false })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Key Bindings', selected: false })
    ).toBeVisible();

    const virtualControlsForm = screen.getByRole('form', {
      name: 'Virtual Controls Form'
    });
    expect(virtualControlsForm).toBeVisible();
    expect(virtualControlsForm.id).toEqual(
      screen.getByRole('button', { name: 'Save Changes' }).getAttribute('form')
    );

    // select control profiles
    await userEvent.click(screen.getByRole('tab', { name: 'Profiles' }));

    expect(
      screen.getByRole('tab', { name: 'Profiles', selected: true })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Key Bindings', selected: false })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Virtual Controls', selected: false })
    ).toBeVisible();

    expect(screen.getByRole('list', { name: 'Profiles List' })).toBeVisible();
    // note: save changes button is not shown on control profiles tab
    expect(
      screen.queryByRole('button', { name: 'Save Changes' })
    ).not.toBeInTheDocument();

    // select key bindings form
    await userEvent.click(screen.getByRole('tab', { name: 'Key Bindings' }));

    expect(
      screen.getByRole('tab', { name: 'Key Bindings', selected: true })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Profiles', selected: false })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Virtual Controls', selected: false })
    ).toBeVisible();

    const keyBindingsForm = screen.getByRole('form', {
      name: 'Key Bindings Form'
    });
    expect(keyBindingsForm).toBeVisible();
    expect(keyBindingsForm.id).toEqual(
      screen.getByRole('button', { name: 'Save Changes' }).getAttribute('form')
    );

    // re-select virtual controls form
    await userEvent.click(
      screen.getByRole('tab', { name: 'Virtual Controls' })
    );

    expect(
      screen.getByRole('tab', { name: 'Virtual Controls', selected: true })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Profiles', selected: false })
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: 'Key Bindings', selected: false })
    ).toBeVisible();

    const virtualControlsFormReNavigate = screen.getByRole('form', {
      name: 'Virtual Controls Form'
    });
    expect(virtualControlsFormReNavigate).toBeVisible();
    expect(virtualControlsFormReNavigate.id).toEqual(
      screen.getByRole('button', { name: 'Save Changes' }).getAttribute('form')
    );
  });

  it('resets movable control layouts', async () => {
    const clearLayoutsSpy = vi.fn();
    const { useLayoutContext: original } = await vi.importActual<
      typeof contextHooks
    >('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...original(),
      clearLayouts: clearLayoutsSpy
    }));

    renderWithContext(<ControlsModal />);

    const resetPositionsButton = screen.getByRole('button', {
      name: 'Reset All Positions'
    });

    expect(resetPositionsButton).toBeVisible();

    await userEvent.click(resetPositionsButton);

    expect(clearLayoutsSpy).toHaveBeenCalledOnce();
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

    renderWithContext(<ControlsModal />);

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

    renderWithContext(<ControlsModal />);

    expect(
      await screen.findByText(
        'Select which virtual controls you wish to enable in this form tab.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Select which virtual controls you wish to enable in this form tab.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        'Use this button to reset the positions of the screen, control panel, and all virtual controls.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText('Use the tab panel to change which form you are seeing.')
    ).toBeVisible();

    expect(
      screen.getByText(
        (_, element) =>
          element?.nodeName === 'P' &&
          element?.textContent ===
            'Select the KEY BINDINGS tab above, then click next!'
      )
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole('tab', { name: 'Key Bindings', selected: false })
    );
    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        'Remap keybindings by selecting a form field and typing your desired input.'
      )
    ).toBeVisible();

    // advance tour
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));

    expect(
      screen.getByText(
        (_, element) =>
          element?.nodeName === 'P' &&
          element?.textContent ===
            'Use the Save Changes button to persist changes from the current form tab.'
      )
    ).toBeVisible();
  });
});
