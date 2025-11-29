import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { useAuthContext } from './context.tsx';

type saveName = string;
export type SaveListResponse = saveName[];

export const useListSaves = (
  options?: UseQueryOptions<SaveListResponse, Error>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useQuery<SaveListResponse, Error>({
    queryKey: ['gbaSaves', accessToken, apiLocation],
    queryFn: async () => {
      const url = `${apiLocation}/api/save/list`;
      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      };

      const res = await fetch(url, options);
      return res.json();
    },
    ...options
  });
};
