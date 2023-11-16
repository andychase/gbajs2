import { useState, useEffect, useCallback } from 'react';

type asyncDataProps<T, R> = {
  fetchFn: (fetchProps?: T) => Promise<R>;
  loadOnMount?: boolean;
  clearDataOnLoad?: boolean;
};

// Options:
// fetchFn (required): the function to execute to get data
// loadOnMount (opt): load the data on component mount
// clearDataOnLoad (opt): clear old data on new load regardless of success state
export const useAsyncData = <T, R>({
  fetchFn,
  loadOnMount = false,
  clearDataOnLoad = false,
}: asyncDataProps<T, R>) => {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = () => setError(null);

  const execute = useCallback(
    async (fetchProps?: T) => {
      setIsLoading(true);
      setError(null);
      if (clearDataOnLoad) setData(null);

      try {
        const resp = await fetchFn(fetchProps);
        setData(resp);
        setIsLoading(false);
      } catch (e) {
        setError(e);
        setIsLoading(false);
      }
    },
    [clearDataOnLoad, fetchFn]
  );

  useEffect(() => {
    if (loadOnMount && !!fetchFn) {
      execute();
    }
    // without linter override here we would
    // re-trigger effect on every access token refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error, clearError, execute };
};
