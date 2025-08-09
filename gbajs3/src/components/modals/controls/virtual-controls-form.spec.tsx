import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VirtualControlsForm } from './virtual-controls-form.tsx';
import { renderWithContext } from '../../../../test/render-with-context.tsx';
import { GbaDarkTheme } from '../../../context/theme/theme.tsx';
import { virtualControlsLocalStorageKey } from '../../controls/consts.tsx';

describe('<VirtualControlsForm />', () => {
  it('renders form with required fields', () => {
    renderWithContext(
      <VirtualControlsForm id="testId" onAfterSubmit={vi.fn()} />
    );

    expect(
      screen.getByRole('form', { name: 'Virtual Controls Form' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Virtual D-pad/Buttons')).toBeInTheDocument();
    expect(screen.getByLabelText('Save State')).toBeInTheDocument();
    expect(screen.getByLabelText('Load State')).toBeInTheDocument();
    expect(screen.getByLabelText('Quick Reload')).toBeInTheDocument();
    expect(screen.getByLabelText('Send save to server')).toBeInTheDocument();
    expect(screen.getByLabelText('Enable Notifications')).toBeInTheDocument();
  });

  it('renders form with provided id', () => {
    renderWithContext(
      <VirtualControlsForm id="testId" onAfterSubmit={vi.fn()} />
    );

    expect(
      screen.getByRole('form', { name: 'Virtual Controls Form' })
    ).toHaveAttribute('id', 'testId');
  });

  it('submits default values with external button', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const onAfterSubmitSpy = vi.fn();

    renderWithContext(
      <>
        <VirtualControlsForm id="testId" onAfterSubmit={onAfterSubmitSpy} />
        <button form="testId" type="submit">
          submit
        </button>
      </>
    );

    const submitButton = screen.getByRole('button', { name: 'submit' });

    expect(submitButton).toBeInTheDocument();

    await userEvent.click(submitButton);

    expect(setItemSpy).toHaveBeenCalledWith(
      virtualControlsLocalStorageKey,
      '{"OpadAndButtons":true,"SaveState":true,"LoadState":true,"QuickReload":true,"SendSaveToServer":true,"NotificationsEnabled":true}'
    );
    expect(onAfterSubmitSpy).toHaveBeenCalledOnce();
  });

  it('form values can be changed and properly persisted', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const onAfterSubmitSpy = vi.fn();

    renderWithContext(
      <>
        <VirtualControlsForm id="testId" onAfterSubmit={onAfterSubmitSpy} />
        <button form="testId" type="submit">
          submit
        </button>
      </>
    );

    const submitButton = screen.getByRole('button', { name: 'submit' });

    expect(submitButton).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    const switches = screen.getAllByRole('switch');

    expect(checkboxes).toHaveLength(5);
    expect(switches).toHaveLength(1);

    for (const el of [...checkboxes, ...switches]) {
      await userEvent.click(el);
    }

    await userEvent.click(submitButton);

    expect(setItemSpy).toHaveBeenCalledWith(
      virtualControlsLocalStorageKey,
      '{"OpadAndButtons":false,"SaveState":false,"LoadState":false,"QuickReload":false,"SendSaveToServer":false,"NotificationsEnabled":false}'
    );
    expect(onAfterSubmitSpy).toHaveBeenCalledOnce();
  });

  it('virtual controls are true by default on mobile resolutions', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query !== GbaDarkTheme.isLargerThanPhone,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      onchange: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    }));

    renderWithContext(
      <VirtualControlsForm id="testId" onAfterSubmit={vi.fn()} />
    );

    expect(screen.getByLabelText('Virtual D-pad/Buttons')).toBeChecked();
    expect(screen.getByLabelText('Save State')).toBeChecked();
    expect(screen.getByLabelText('Load State')).toBeChecked();
    expect(screen.getByLabelText('Quick Reload')).toBeChecked();
    expect(screen.getByLabelText('Send save to server')).toBeChecked();
  });

  it('virtual controls are false by default on desktop resolutions', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === GbaDarkTheme.isLargerThanPhone,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      onchange: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true
    }));

    renderWithContext(
      <VirtualControlsForm id="testId" onAfterSubmit={vi.fn()} />
    );

    expect(screen.getByLabelText('Virtual D-pad/Buttons')).not.toBeChecked();
    expect(screen.getByLabelText('Save State')).not.toBeChecked();
    expect(screen.getByLabelText('Load State')).not.toBeChecked();
    expect(screen.getByLabelText('Quick Reload')).not.toBeChecked();
    expect(screen.getByLabelText('Send save to server')).not.toBeChecked();
  });

  it('renders initial values from storage', () => {
    localStorage.setItem(
      virtualControlsLocalStorageKey,
      '{"OpadAndButtons":false,"SaveState":true,"LoadState":true,"QuickReload":true,"SendSaveToServer":true,"NotificationsEnabled":false}'
    );

    renderWithContext(
      <VirtualControlsForm id="testId" onAfterSubmit={vi.fn()} />
    );

    expect(screen.getByLabelText('Virtual D-pad/Buttons')).not.toBeChecked();
    expect(screen.getByLabelText('Save State')).toBeChecked();
    expect(screen.getByLabelText('Load State')).toBeChecked();
    expect(screen.getByLabelText('Quick Reload')).toBeChecked();
    expect(screen.getByLabelText('Send save to server')).toBeChecked();
    expect(screen.getByLabelText('Enable Notifications')).not.toBeChecked();
  });
});
