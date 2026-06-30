import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { profileRepository } from '../repositories/profileRepository';
import { getNeonClient } from '../lib/neon';
import type { UserProfile } from '../types';
import { AuthContext } from './auth-context';

type SessionUser = {
  id: string;
  email?: string;
  name?: string | null;
  user_metadata?: { name?: string | null };
};

function authIdentity(user: SessionUser) {
  if (!user.id || !user.email) {
    throw new Error('Phiên đăng nhập không chứa thông tin người dùng hợp lệ.');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.user_metadata?.name ?? null,
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  const hydrateSession = useCallback(async () => {
    setLoading(true);
    setInitializationError(null);

    try {
      const neon = getNeonClient();
      const { data, error } = await neon.auth.getSession();
      if (error) throw error;

      if (!data.session?.user) {
        setUser(null);
        return;
      }

      setUser(
        await profileRepository.ensure(
          authIdentity(data.session.user as SessionUser),
        ),
      );
    } catch (error: unknown) {
      setUser(null);
      setInitializationError(
        errorMessage(error, 'Không thể khởi tạo phiên đăng nhập.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrateSession();

    try {
      const neon = getNeonClient();
      const { data } = neon.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          setUser(null);
          return;
        }

        void profileRepository
          .ensure(authIdentity(session.user as SessionUser))
          .then(setUser)
          .catch((error: unknown) => {
            setInitializationError(
              errorMessage(error, 'Không thể đồng bộ phiên đăng nhập.'),
            );
          });
      });

      return () => data.subscription.unsubscribe();
    } catch (error: unknown) {
      setUser(null);
      setInitializationError(
        errorMessage(error, 'Không thể khởi tạo phiên đăng nhập.'),
      );
      setLoading(false);
      return undefined;
    }
  }, [hydrateSession]);

  const login = async (email: string, password: string) => {
    setLoginError(null);

    try {
      const neon = getNeonClient();
      const { data, error } = await neon.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const sessionUser = data.user ?? data.session?.user;
      if (!sessionUser) throw new Error('Không nhận được phiên đăng nhập.');

      setUser(
        await profileRepository.ensure(
          authIdentity(sessionUser as SessionUser),
        ),
      );
    } catch (error: unknown) {
      const message = errorMessage(error, 'Đăng nhập thất bại.');
      setLoginError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    const neon = getNeonClient();
    const { error } = await neon.auth.signOut();
    if (error) throw error;
    setUser(null);
    setLoginError(null);
  };

  const retry = () => {
    void hydrateSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializationError,
        loginError,
        login,
        logout,
        retry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
