import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  profileWarning: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
