import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { useAuthContext } from './context.tsx';

export type LoadSaveProps = {
  saveName: string;
};

export const useLoadSave = (
  options?: UseMutationOptions<File, Error, LoadSaveProps>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useMutation<File, Error, LoadSaveProps>({
    mutationKey: ['loadSave', accessToken],
    mutationFn: async (fetchProps?: LoadSaveProps) => {
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

      if (!res.ok) {
        throw new Error(`Received unexpected status code: ${res.status}`);
      }

      const blob = await res.blob();
      const file = new File([blob], fetchProps?.saveName ?? '');

      return file;
    },
    ...options
  });
};
