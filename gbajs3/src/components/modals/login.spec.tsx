import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginModal } from './login.tsx';
import { renderWithContext } from '../../../test/render-with-context.tsx';
import * as contextHooks from '../../hooks/context.tsx';
import { productTourLocalStorageKey } from '../product-tour/consts.tsx';

describe('<LoginModal />', () => {
  it('renders login form', () => {
    renderWithContext(<LoginModal />);

    expect(screen.getByRole('form', { name: 'Login Form' })).toBeVisible();
    expect(screen.getByLabelText('Username')).toBeVisible();
    expect(screen.getByLabelText('Password')).toBeVisible();
  });

  it('logs user into the server and closes modal', async () => {
    const setIsModalOpenSpy = vi.fn();
    const setAccessTokenSpy = vi.fn();
    const setAccessTokenSourceSpy = vi.fn();
    const { useModalContext: originalModal, useAuthContext: originalAuth } =
      await vi.importActual<typeof contextHooks>('../../hooks/context.tsx');

    vi.spyOn(contextHooks, 'useModalContext').mockImplementation(() => ({
      ...originalModal(),
      setIsModalOpen: setIsModalOpenSpy
    }));

    vi.spyOn(contextHooks, 'useAuthContext').mockImplementation(() => ({
      ...originalAuth(),
      setAccessToken: setAccessTokenSpy,
      setAccessTokenSource: setAccessTokenSourceSpy
    }));

    renderWithContext(<LoginModal />);

    const loginButton = screen.getByRole('button', { name: 'Login' });

    await userEvent.type(screen.getByLabelText('Username'), 'valid_user');
    await userEvent.type(screen.getByLabelText('Password'), 'valid_pass');

    expect(loginButton).toBeInTheDocument();

    await userEvent.click(loginButton);

    await waitForElementToBeRemoved(screen.queryByTestId('login-spinner'));

    expect(setAccessTokenSpy).toHaveBeenCalledOnce();
    expect(setAccessTokenSourceSpy).toHaveBeenCalledOnce();
    expect(setIsModalOpenSpy).toHaveBeenCalledOnce();

    expect(setAccessTokenSpy).toHaveBeenCalledWith('some token');
    expect(setAccessTokenSourceSpy).toHaveBeenCalledWith('login');
    expect(setIsModalOpenSpy).toHaveBeenCalledWith(false);
  });

  it('renders form validation errors', async () => {
    renderWithContext(<LoginModal />);

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByText('Username is required')).toBeVisible();
    expect(screen.getByText('Password is required')).toBeVisible();
  });

  it('renders error message failure to login', async () => {
    renderWithContext(<LoginModal />);

    await userEvent.type(screen.getByLabelText('Username'), 'invalid_user');
    await userEvent.type(screen.getByLabelText('Password'), 'invalid_pass');

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitForElementToBeRemoved(screen.queryByTestId('login-spinner'));

    expect(screen.getByText('Login has failed')).toBeInTheDocument();
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

    renderWithContext(<LoginModal />);

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

    renderWithContext(<LoginModal />);

    expect(
      await screen.findByText(
        'Use this form to login for premium features if you have a registered account.'
      )
    ).toBeInTheDocument();

    // click joyride floater
    await userEvent.click(
      screen.getByRole('button', { name: 'Open the dialog' })
    );

    expect(
      screen.getByText(
        'Use this form to login for premium features if you have a registered account.'
      )
    ).toBeVisible();
  });
});
