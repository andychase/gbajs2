import { useCallback } from 'react';

import { useAsyncData } from './use-async-data.tsx';

type LoadExternalRomProps = {
  url: URL;
};

export const useLoadExternalRom = () => {
  const executeLoadExternalRom = useCallback(
    async (fetchProps?: LoadExternalRomProps) => {
      const options: RequestInit = {
        method: 'GET'
      };

      if (!fetchProps) return;

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
    []
  );

  const { data, isLoading, error, execute } = useAsyncData({
    fetchFn: executeLoadExternalRom,
    clearDataOnLoad: true
  });

  return { data, isLoading, error, execute };
};
