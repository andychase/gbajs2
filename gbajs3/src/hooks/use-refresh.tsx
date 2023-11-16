import { useCallback } from 'react';

import { useAsyncData } from './use-async-data.tsx';

export const useRefreshAccessToken = ({ loadOnMount = false } = {}) => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;

  const executeRefresh = useCallback(async () => {
    const url = `${apiLocation}/api/tokens/refresh`;
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };

    const res = await fetch(url, options);
    return res.json();
  }, [apiLocation]);

  const { data, isLoading, error, clearError, execute } = useAsyncData({
    fetchFn: executeRefresh,
    clearDataOnLoad: true,
    loadOnMount,
  });

  return { data, isLoading, error, clearError, execute };
};
