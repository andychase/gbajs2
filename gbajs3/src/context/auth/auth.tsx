import {jwtDecode,  type JwtPayload } from 'jwt-decode';
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type SetStateAction,
  type Dispatch,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { useRefreshAccessToken } from '../../hooks/use-refresh.tsx';

type AccessTokenSource = 'refresh' | 'login' | null;

type AuthContextProps = {
  accessToken: string | null;
  setAccessToken: Dispatch<SetStateAction<string | null>>;
  setAccessTokenSource: Dispatch<SetStateAction<AccessTokenSource | null>>;
  isAuthenticated: () => boolean;
};

type AuthProviderProps = { children: ReactNode };

export const AuthContext = createContext<AuthContextProps>({
  accessToken: null,
  setAccessToken: () => undefined,
  setAccessTokenSource: () => undefined,
  isAuthenticated: () => false,
});

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const fourMinutesInMS = 240 * 1000;
  const [accessToken, setAccessToken] =
    useState<AuthContextProps['accessToken']>(null);
  const [accessTokenSource, setAccessTokenSource] =
    useState<AccessTokenSource>(null);

  // generate initial access token
  const {
    data: accessTokenResp,
    isLoading: refreshloading,
    execute: executeRefresh,
    error: refreshTokenError,
    clearError: refreshClearError,
  } = useRefreshAccessToken({ loadOnMount: true });

  // assign token to context
  useEffect(() => {
    if (!refreshloading && accessTokenResp) {
      setAccessToken(accessTokenResp);
      setAccessTokenSource('refresh');
    }
  }, [refreshloading, accessTokenResp, setAccessToken]);

  // convenience callback to determine if token is expired
  const isAuthenticated = useCallback(() => {
    if (accessToken) {
      const { exp } = jwtDecode<JwtPayload>(accessToken);

      if (exp && Date.now() <= exp * 1000) {
        return true;
      }
    }

    return false;
  }, [accessToken]);

  useEffect(() => {
    // if access token has changed from login, clear refresh errors.
    // resume attempts to periodically refresh the token
    if (
      isAuthenticated() &&
      !accessTokenResp &&
      accessTokenSource !== 'refresh'
    ) {
      refreshClearError();
    }
  }, [accessTokenSource, accessTokenResp, isAuthenticated, refreshClearError]);

  // refresh access token every 4 minutes
  useInterval(
    async () => {
      await executeRefresh();
    },
    // TODO: re-evaluate whether or not auth check is desired
    isAuthenticated() && !refreshTokenError ? fourMinutesInMS : null
  );

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        setAccessToken,
        setAccessTokenSource,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
