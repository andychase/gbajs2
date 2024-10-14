import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ControlProfiles } from './control-profiles.tsx';
import { renderWithContext } from '../../../../test/render-with-context.tsx';
import * as contextHooks from '../../../hooks/context.tsx';
import { virtualControlProfilesLocalStorageKey } from '../../controls/consts.tsx';

describe('<ControlProfiles />', () => {
  it('renders if there are no profiles', () => {
    renderWithContext(<ControlProfiles id="testId" />);

    expect(screen.getByText('No control profiles'));
    expect(
      screen.getByRole('button', { name: 'Create New Profile' })
    ).toBeVisible();
  });

  it('renders profiles from storage', () => {
    localStorage.setItem(
      virtualControlProfilesLocalStorageKey,
      '[{"id":"testId1","name":"Profile-1","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true},{"id":"testId2","name":"Profile-2","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true}]'
    );

    renderWithContext(<ControlProfiles id="testId" />);

    expect(screen.getByRole('button', { name: 'Profile-1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Profile-2' })).toBeVisible();
    expect(screen.getByRole('button', { name: "Edit Profile-1's name" }));
    expect(screen.getByRole('button', { name: "Edit Profile-2's name" }));
    expect(screen.getByRole('button', { name: 'Delete Profile-1' }));
    expect(screen.getByRole('button', { name: 'Delete Profile-2' }));
  });

  it('loads a profile', async () => {
    localStorage.setItem(
      virtualControlProfilesLocalStorageKey,
      '[{"id":"testId1","name":"Profile-1","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true}]'
    );

    const setLayoutsSpy = vi.fn();

    const { useLayoutContext: originalLayout } = await vi.importActual<
      typeof contextHooks
    >('../../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useLayoutContext').mockImplementation(() => ({
      ...originalLayout(),
      setLayouts: setLayoutsSpy
    }));

    renderWithContext(<ControlProfiles id="testId" />);

    await userEvent.click(screen.getByRole('button', { name: 'Profile-1' }));

    expect(setLayoutsSpy).toHaveBeenCalledWith({
      controlPanel: expect.anything(),
      screen: expect.anything()
    });
  });

  it('adds new profiles', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderWithContext(<ControlProfiles id="testId" />);

    await userEvent.click(screen.getByLabelText('Create New Profile'));

    expect(screen.getByRole('button', { name: 'Profile-1' }));

    expect(setItemSpy).toHaveBeenCalledWith(
      virtualControlProfilesLocalStorageKey,
      expect.stringMatching(
        /\[{"id":".*","name":"Profile-1","layouts":{},"active":true}\]/
      )
    );

    await userEvent.click(screen.getByLabelText('Create New Profile'));

    expect(screen.getByRole('button', { name: 'Profile-2' }));

    expect(setItemSpy).toHaveBeenCalledWith(
      virtualControlProfilesLocalStorageKey,
      expect.stringMatching(
        /\[{"id":".*","name":"Profile-1","layouts":{},"active":true},{"id":".*","name":"Profile-2","layouts":{},"active":true}\]/
      )
    );
  });

  it('updates a profile name', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    localStorage.setItem(
      virtualControlProfilesLocalStorageKey,
      '[{"id":"testId1","name":"Profile-1","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true},{"id":"testId2","name":"Profile-2","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true}]'
    );

    renderWithContext(<ControlProfiles id="testId" />);

    await userEvent.click(
      screen.getByRole('button', { name: "Edit Profile-1's name" })
    );

    await userEvent.type(screen.getByRole('textbox'), '-edited');

    await userEvent.click(
      screen.getByRole('button', { name: "Save Profile-1's name" })
    );

    expect(screen.getByRole('button', { name: 'Profile-1-edited' }));

    expect(setItemSpy).toHaveBeenCalledWith(
      virtualControlProfilesLocalStorageKey,
      expect.stringMatching(/\[{"id":"testId1","name":"Profile-1-edited".*\]/)
    );
  });

  it('deletes a profile', async () => {
    localStorage.setItem(
      virtualControlProfilesLocalStorageKey,
      '[{"id":"testId1","name":"Profile-1","layouts":{"screen":{"initialBounds":{"x":260,"y":15,"width":834,"height":600.09375,"top":15,"right":1094,"bottom":615.09375,"left":260}},"controlPanel":{"initialBounds":{"x":260,"y":620,"width":584,"height":60,"top":620,"right":844,"bottom":680,"left":260}}},"active":true}]'
    );

    renderWithContext(<ControlProfiles id="testId" />);

    await userEvent.click(screen.getByLabelText('Delete Profile-1'));

    expect(screen.getByText('No control profiles'));
  });
});
