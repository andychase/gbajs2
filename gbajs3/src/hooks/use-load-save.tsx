import { useCallback } from 'react';

import { useAuthContext } from './context.tsx';
import { useAsyncData } from './use-async-data.tsx';

type LoadSaveProps = {
  saveName: string;
};

export const useLoadSave = () => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  const executeLoadSave = useCallback(
    async (fetchProps?: LoadSaveProps) => {
      const url = `${apiLocation}/api/save/download?save=${
        fetchProps?.saveName ?? ''
      }`;
      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      };

      const res = await fetch(url, options);
      const blob = await res.blob();
      const file = new File([blob], fetchProps?.saveName ?? '');

      return file;
    },
    [apiLocation, accessToken]
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeLoadSave,
    clearDataOnLoad: true
  });

  return { data, isLoading, error, execute };
};
