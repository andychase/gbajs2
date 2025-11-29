import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

type LoadExternalRomProps = {
  url: URL;
};

export const useLoadExternalRom = (
  options?: UseMutationOptions<File, Error, LoadExternalRomProps>
) => {
  return useMutation<File, Error, LoadExternalRomProps>({
    mutationKey: ['loadExternalRom'],
    mutationFn: async (fetchProps?: LoadExternalRomProps) => {
      if (!fetchProps) throw new Error('Missing URL for external rom load');

      const options: RequestInit = { method: 'GET' };

      const res = await fetch(fetchProps.url, options);

      // extract file name from response headers if possible
      const fileName = res.headers
        .get('Content-Disposition')
        ?.split(';')
        .pop()
        ?.split('=')
        .pop()
        ?.replace(/"/g, '');

      const fallbackFileName = decodeURIComponent(
        fetchProps.url.pathname.split('/').pop() ?? 'unknown_external.gba'
      );

      if (!res.ok) {
        throw new Error(`Received unexpected status code: ${res.status}`);
      }

      const blob = await res.blob();
      const file = new File([blob], fileName ?? fallbackFileName);

      return file;
    },
    ...options
  });
};
