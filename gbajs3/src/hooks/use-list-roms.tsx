import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { useAuthContext } from './context.tsx';

const RomListSchema = z.array(z.string());
export type RomListResponse = z.infer<typeof RomListSchema>;

export const useListRoms = (
  options?: UseQueryOptions<RomListResponse, Error>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useQuery<RomListResponse, Error>({
    queryKey: ['gbaRoms', apiLocation, accessToken],
    queryFn: async () => {
      const url = `${apiLocation}/api/rom/list`;
      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      };

      const res = await fetch(url, options);
      return RomListSchema.parse(await res.json());
    },
    ...options
  });
};
