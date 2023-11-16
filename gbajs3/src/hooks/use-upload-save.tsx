import { useCallback, useContext } from 'react';

import { useAsyncData } from './use-async-data.tsx';
import { AuthContext } from '../context/auth/auth.tsx';

type UploadSaveProps = {
  saveFile: File;
};

export const useUpLoadSave = () => {
  const apiLocation: string = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useContext(AuthContext);

  const executeUploadSave = useCallback(
    async (fetchProps?: UploadSaveProps) => {
      const url = `${apiLocation}/api/save/upload`;
      const formData = new FormData();
      formData.append('save', fetchProps?.saveFile ?? '');
      const options: RequestInit = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      };

      return fetch(url, options);
    },
    [apiLocation, accessToken]
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeUploadSave,
    clearDataOnLoad: true,
  });

  return { data, isLoading, error, execute };
};
