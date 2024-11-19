import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileSystemOptionsForm } from './file-system-options-form.tsx';
import { renderWithContext } from '../../../../test/render-with-context.tsx';
import * as addCallbacksHooks from '../../../hooks/emulator/use-add-callbacks.tsx';

import type { CoreCallbackOptions } from '../../../hooks/emulator/use-add-callbacks.tsx';

describe('<FileSystemOptionsForm />', () => {
  it('shows title and plus icon when collapsed', () => {
    renderWithContext(<FileSystemOptionsForm id="testId" />);

    expect(screen.getByText('Options'));
    expect(screen.getByTestId('action-box:plus')).toBeVisible();
    expect(screen.queryByTestId('action-box:minus')).not.toBeInTheDocument();
    expect(screen.getByLabelText('File System Options Form')).not.toBeVisible();
  });

  it('shows options form and minus icon when expanded', async () => {
    renderWithContext(<FileSystemOptionsForm id="testId" />);

    await userEvent.click(screen.getByText('Options'));

    expect(screen.getByText('Options'));
    expect(screen.getByTestId('action-box:minus')).toBeVisible();
    expect(screen.queryByTestId('action-box:plus')).not.toBeInTheDocument();
    // form and form fields
    expect(screen.getByLabelText('File System Options Form')).toBeVisible();
    expect(screen.getByText('Save file system on in-game save')).toBeVisible();
    expect(
      screen.getByText('Save file system on creates / updates / deletes')
    ).toBeVisible();
  });

  it('saves file system options', async () => {
    const addCallbacksAndSaveSettingsSpy: (f: CoreCallbackOptions) => void =
      vi.fn();

    vi.spyOn(addCallbacksHooks, 'useAddCallbacks').mockImplementation(() => ({
      addCallbacks: vi.fn(),
      addCallbacksAndSaveSettings: addCallbacksAndSaveSettingsSpy,
      syncActionIfEnabled: vi.fn()
    }));

    renderWithContext(<FileSystemOptionsForm id="testId" />);

    await userEvent.click(screen.getByText('Options'));

    const submitButton = screen.getByRole('button', { name: 'Save Options' });

    // change values
    await userEvent.click(
      screen.getByLabelText('Save file system on in-game save')
    );
    await userEvent.click(
      screen.getByLabelText('Save file system on creates / updates / deletes')
    );
    await userEvent.click(screen.getByLabelText('Enable Notifications'));
    // submit form
    await userEvent.click(submitButton);

    expect(addCallbacksAndSaveSettingsSpy).toHaveBeenCalledOnce();
    expect(addCallbacksAndSaveSettingsSpy).toHaveBeenCalledWith(
      {
        saveFileSystemOnInGameSave: true,
        notificationsEnabled: true,
        saveFileSystemOnCreateUpdateDelete: true
      },
      expect.anything()
    );
  });
});
