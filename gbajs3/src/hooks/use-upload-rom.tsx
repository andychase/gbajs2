import { useCallback, useContext } from 'react';

import { useAsyncData } from './use-async-data.tsx';
import { AuthContext } from '../context/auth/auth.tsx';

type UploadRomProps = {
  romFile: File;
};

export const useUpLoadRom = () => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useContext(AuthContext);

  const executeUploadRom = useCallback(
    async (fetchProps?: UploadRomProps) => {
      const url = `${apiLocation}/api/rom/upload`;
      const formData = new FormData();
      formData.append('rom', fetchProps?.romFile ?? '');
      const options: RequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      };

      return fetch(url, options);
    },
    [apiLocation, accessToken]
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeUploadRom,
    clearDataOnLoad: true
  });

  return { data, isLoading, error, execute };
};
