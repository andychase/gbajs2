import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { useAuthContext } from './context.tsx';

export type LoadRomProps = {
  romName: string;
};

export const useLoadRom = (
  options?: UseMutationOptions<File, Error, LoadRomProps>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useMutation<File, Error, LoadRomProps>({
    mutationKey: ['loadRom', accessToken],
    mutationFn: async (fetchProps) => {
      const url = `${apiLocation}/api/rom/download?rom=${fetchProps.romName}`;
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
      const file = new File([blob], fetchProps.romName);

      return file;
    },
    ...options
  });
};
