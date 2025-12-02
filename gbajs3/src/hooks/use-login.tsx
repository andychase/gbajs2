import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { z } from 'zod';

const TokenSchema = z.string();

type LoginProps = {
  username: string;
  password: string;
};

export const useLogin = (
  options?: UseMutationOptions<string, Error, LoginProps, string>
) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;

  return useMutation<string, Error, LoginProps, string>({
    mutationKey: ['login'],
    mutationFn: async (fetchProps) => {
      const username = fetchProps.username;
      const password = fetchProps.password;

      const url = `${apiLocation}/api/account/login`;
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      };

      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`Received unexpected status code: ${res.status}`);
      }

      return TokenSchema.parse(await res.json());
    },
    ...options
  });
};
