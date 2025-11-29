import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { useAuthContext } from './context.tsx';

type UploadSaveProps = {
  saveFile: File;
};

export const useUpLoadSave = (
  options?: UseMutationOptions<Response, Error, UploadSaveProps>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useMutation<Response, Error, UploadSaveProps>({
    mutationKey: ['uploadSave', accessToken],
    mutationFn: async (fetchProps?: UploadSaveProps) => {
      const url = `${apiLocation}/api/save/upload`;
      const formData = new FormData();
      formData.append('save', fetchProps?.saveFile ?? '');
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
