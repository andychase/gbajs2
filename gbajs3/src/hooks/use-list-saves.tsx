import { useCallback, useContext } from 'react';

import { useAsyncData } from './use-async-data.tsx';
import { AuthContext } from '../context/auth/auth.tsx';

export const useListSaves = ({ loadOnMount = false } = {}) => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useContext(AuthContext);

  const executeListSaves = useCallback(async () => {
    const url = `${apiLocation}/api/save/list`;
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const res = await fetch(url, options);
    return res.json();
  }, [apiLocation, accessToken]);

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeListSaves,
    clearDataOnLoad: true,
    loadOnMount,
  });

  return { data, isLoading, error, execute };
};
