import { useCallback } from 'react';

import { useAuthContext } from './context.tsx';
import { useAsyncData } from './use-async-data.tsx';

type UploadRomProps = {
  romFile: File;
};

export const useUpLoadRom = () => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

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

      const res = await fetch(url, options);

      if (!res.ok) {
        throw new Error(`Received unexpected status code: ${res.status}`);
      }

      return res;
    },
    [apiLocation, accessToken]
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeUploadRom,
    clearDataOnLoad: true
  });

  return { data, isLoading, error, execute };
};
