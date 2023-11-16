import { useCallback, useContext } from 'react';

import { useAsyncData } from './use-async-data.tsx';
import { AuthContext } from '../context/auth/auth.tsx';

export const useLogout = () => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken, setAccessToken } = useContext(AuthContext);

  const executeUseLogout = useCallback(async () => {
    const url = `${apiLocation}/api/account/logout`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    };

    return fetch(url, options).then(() => setAccessToken(null));
  }, [apiLocation, accessToken, setAccessToken]);

  const { isLoading, error, execute } = useAsyncData({
    fetchFn: executeUseLogout,
    clearDataOnLoad: true,
  });

  return { isLoading, error, execute };
};
