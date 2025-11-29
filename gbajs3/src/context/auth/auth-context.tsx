import { createContext } from 'react';

export type AccessTokenSource = 'refresh' | 'login' | null;

export type AuthContextProps = {
  accessToken?: string | null;
  setLoginToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
};

export const AuthContext = createContext<AuthContextProps | null>(null);

AuthContext.displayName = 'AuthContext';
