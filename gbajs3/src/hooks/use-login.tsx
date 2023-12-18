import { useCallback } from 'react';

import { useAsyncData } from './use-async-data.tsx';

type LoginProps = {
  username: string;
  password: string;
};

export const useLogin = () => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;

  const executeLogin = useCallback(
    async (fetchProps?: LoginProps) => {
      const username = fetchProps?.username || '';
      const password = fetchProps?.password || '';

      const url = `${apiLocation}/api/account/login`;
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      };

      const res = await fetch(url, options);
      return res.json();
    },
    [apiLocation]
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeLogin,
    clearDataOnLoad: true
  });

  return { data, isLoading, error, execute };
};
