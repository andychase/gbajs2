import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { useAuthContext } from './context.tsx';

type UploadRomProps = {
  romFile: File;
};

export const useUpLoadRom = (
  options?: UseMutationOptions<Response, Error, UploadRomProps>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useMutation<Response, Error, UploadRomProps>({
    mutationKey: ['uploadRom', accessToken],
    mutationFn: async (fetchProps) => {
      const url = `${apiLocation}/api/rom/upload`;
      const formData = new FormData();
      formData.append('rom', fetchProps.romFile);
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
    ...options
  });
};
