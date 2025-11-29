import { useQueryClient } from '@tanstack/react-query';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { useCallback, type ReactNode } from 'react';

import { AuthContext } from './auth-context.tsx';
import {
  refreshAccessTokenQueryKey,
  useRefreshAccessToken
} from '../../hooks/use-refresh.tsx';

type AuthProviderProps = { children: ReactNode };

const fourMinutesInMS = 240 * 1000;

const isTokenAuthenticated = (accessToken?: string | null) => {
  if (!accessToken) return false;

  const { exp } = jwtDecode<JwtPayload>(accessToken);
  return !!exp && Date.now() <= exp * 1000;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient();

  const setLoginToken = useCallback(
    (token: string) =>
      queryClient.setQueryData([refreshAccessTokenQueryKey], token),
    [queryClient]
  );

  const logout = useCallback(
    () => queryClient.setQueryData([refreshAccessTokenQueryKey], null),
    [queryClient]
  );

  const { data: accessToken } = useRefreshAccessToken({
    retry: 0,
    refetchOnWindowFocus: (query) =>
      !isTokenAuthenticated(accessToken) &&
      query.state.data !== null &&
      !query.state.error
        ? 'always'
        : false,
    refetchOnReconnect: (query) =>
      !isTokenAuthenticated(accessToken) &&
      query.state.data !== null &&
      !query.state.error
        ? 'always'
        : false,
    refetchInterval: (query) => {
      const shouldRefresh =
        isTokenAuthenticated(query.state.data) ||
        (query.state.data !== null && !query.state.error);

      return shouldRefresh ? fourMinutesInMS : false;
    }
  });

  const isAuthenticated = useCallback(
    () => isTokenAuthenticated(accessToken),
    [accessToken]
  );

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated,
        setLoginToken,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
