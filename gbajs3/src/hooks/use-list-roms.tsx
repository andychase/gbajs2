import { useCallback } from 'react';

import { useAuthContext } from './context.tsx';
import { useAsyncData } from './use-async-data.tsx';

export const useListRoms = ({ loadOnMount = false } = {}) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  const executeListRoms = useCallback(async () => {
    const url = `${apiLocation}/api/rom/list`;
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    };

    const res = await fetch(url, options);
    return res.json();
  }, [apiLocation, accessToken]);

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeListRoms,
    clearDataOnLoad: true,
    loadOnMount
  });

  return { data, isLoading, error, execute };
};
