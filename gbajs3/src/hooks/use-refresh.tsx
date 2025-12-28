import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { z } from 'zod';

const TokenSchema = z.string();

export const refreshAccessTokenQueryKey = 'refreshAccessToken';

const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;

export const useRefreshAccessToken = (
  options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey'>
) => {
  return useQuery<string | null, Error>({
    queryKey: [refreshAccessTokenQueryKey],
    queryFn: async () => {
      const url = `${apiLocation}/api/tokens/refresh`;
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      };

      const res = await fetch(url, options);

      if (!res.ok) {
        throw new Error(`Received unexpected status code: ${res.status}`);
      }

      return TokenSchema.parse(await res.json());
    },
    enabled: !!apiLocation,
    ...options
  });
};
