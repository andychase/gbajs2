import { TextField, Button } from '@mui/material';
import { useEffect, useId } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { BiError } from 'react-icons/bi';
import { styled, useTheme } from 'styled-components';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { useAuthContext, useModalContext } from '../../hooks/context.tsx';
import { useLogin } from '../../hooks/use-login.tsx';
import {
  EmbeddedProductTour,
  type TourSteps
} from '../product-tour/embedded-product-tour.tsx';
import { ErrorWithIcon } from '../shared/error-with-icon.tsx';
import { PacmanIndicator } from '../shared/loading-indicator.tsx';

type InputProps = {
  username: string;
  password: string;
};

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100dvw;
  max-width: fill-available;
  max-width: stretch;
  max-width: -webkit-fill-available;
  max-width: -moz-available;
`;

export const LoginModal = () => {
  const theme = useTheme();
  const { setIsModalOpen } = useModalContext();
  const { setAccessToken, setAccessTokenSource } = useAuthContext();
  const loginFormId = useId();
  const {
    execute: executeLogin,
    data: accessToken,
    isLoading: loginLoading,
    error: loginError
  } = useLogin();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<InputProps>();

  const shouldSetAccessToken = !loginLoading && !loginError && !!accessToken;

  useEffect(() => {
    if (shouldSetAccessToken) {
      setAccessToken(accessToken);
      setAccessTokenSource('login');
      setIsModalOpen(false);
    }
  }, [
    shouldSetAccessToken,
    accessToken,
    setAccessToken,
    setAccessTokenSource,
    setIsModalOpen
  ]);

  const onSubmit: SubmitHandler<InputProps> = async (formData) => {
    await executeLogin(formData);
    reset();
  };

  const tourSteps: TourSteps = [
    {
      content: (
        <p>
          Use this form to login for premium features if you have a registered
          account.
        </p>
      ),
      target: `#${CSS.escape(loginFormId)}`
    }
  ];

  return (
    <>
      <ModalHeader title="Login" />
      <ModalBody>
        {loginLoading ? (
          <PacmanIndicator data-testid="login-spinner" />
        ) : (
          <StyledForm
            aria-label="Login Form"
            id={loginFormId}
            onSubmit={handleSubmit(onSubmit)}
          >
            <TextField
              error={!!errors?.username}
              label="Username"
              autoComplete="username"
              variant="filled"
              helperText={errors?.username?.message}
              {...register('username', {
                required: { value: true, message: 'Username is required' }
              })}
            />

            <TextField
              error={!!errors?.password}
              label="Password"
              type="password"
              autoComplete="current-password"
              variant="filled"
              helperText={errors?.password?.message}
              {...register('password', {
                required: { value: true, message: 'Password is required' }
              })}
            />
            {!!loginError && (
              <ErrorWithIcon
                icon={<BiError style={{ color: theme.errorRed }} />}
                text="Login has failed"
              />
            )}
          </StyledForm>
        )}
      </ModalBody>
      <ModalFooter>
        <Button form={loginFormId} type="submit" variant="contained">
          Login
        </Button>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
      <EmbeddedProductTour
        skipRenderCondition={loginLoading}
        steps={tourSteps}
        completedProductTourStepName="hasCompletedLoginTour"
      />
    </>
  );
};
