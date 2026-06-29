import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AuthContext } from './auth-context';
import { auth, db, firebaseState, isDemoMode } from '../lib/firebase';
import { DEMO_USER } from '../lib/mockData';
import { withTimeout } from '../lib/firestore';
import type { UserProfile } from '../types';

const errorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;

const initialDemoUser = (): UserProfile | null => {
  if (!isDemoMode) return null;
  const saved = localStorage.getItem('worklog_demo_session');
  if (!saved) return null;
  try {
    return JSON.parse(saved) as UserProfile;
  } catch {
    localStorage.removeItem('worklog_demo_session');
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(initialDemoUser);
  const [loading, setLoading] = useState(firebaseState.status === 'ready');
  const [error, setError] = useState<string | null>(
    firebaseState.status === 'error' ? firebaseState.message : null,
  );
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const authGeneration = useRef(0);

  useEffect(() => {
    if (firebaseState.status === 'error') {
      setLoading(false);
      setError(firebaseState.message);
      return;
    }
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    if (!auth || !db) {
      setLoading(false);
      setError('Dịch vụ Firebase chưa sẵn sàng.');
      return;
    }
    const firebaseAuth = auth;
    const firestore = db;

    let active = true;
    setLoading(true);
    setError(null);
    const safetyTimeout = window.setTimeout(() => {
      if (active) {
        setError('Khởi tạo phiên đăng nhập quá thời gian chờ. Vui lòng thử lại.');
        setLoading(false);
      }
    }, 5_000);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      const generation = ++authGeneration.current;
      window.clearTimeout(safetyTimeout);
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        setProfileWarning(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const basicProfile = profileFromFirebaseUser(firebaseUser);
      try {
        const profileRef = doc(firestore, 'users', firebaseUser.uid);
        const snapshot = await withTimeout(
          getDoc(profileRef),
          5_000,
          'Không thể tải hồ sơ người dùng.',
        );
        if (!active || generation !== authGeneration.current) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          setUser({
            ...basicProfile,
            displayName:
              typeof data.name === 'string' && data.name.trim()
                ? data.name
                : basicProfile.displayName,
          });
        } else {
          await withTimeout(
            setDoc(profileRef, {
              name: basicProfile.displayName,
              email: basicProfile.email,
              createdAt: new Date().toISOString(),
            }),
            5_000,
            'Không thể tạo hồ sơ người dùng.',
          );
          if (!active || generation !== authGeneration.current) return;
          setUser(basicProfile);
        }
        setProfileWarning(null);
      } catch (profileError: unknown) {
        if (!active || generation !== authGeneration.current) return;
        console.error('Error synchronizing user profile:', profileError);
        setUser(basicProfile);
        setProfileWarning('Không thể đồng bộ hồ sơ. Một số thông tin có thể chưa cập nhật.');
      } finally {
        if (active && generation === authGeneration.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      authGeneration.current += 1;
      window.clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, [retryVersion]);

  const login = async (email: string, password: string): Promise<void> => {
    if (firebaseState.status === 'error') throw new Error(firebaseState.message);
    setLoading(true);

    if (isDemoMode) {
      if (email !== DEMO_USER.email || password !== 'demo123') {
        setLoading(false);
        throw new Error('Tài khoản hoặc mật khẩu demo không chính xác.');
      }
      const profile: UserProfile = { ...DEMO_USER };
      localStorage.setItem('worklog_demo_session', JSON.stringify(profile));
      setUser(profile);
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      throw new Error('Firebase Auth chưa sẵn sàng.');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (loginError: unknown) {
      setLoading(false);
      const code = errorCode(loginError);
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        throw new Error('Tài khoản hoặc mật khẩu không chính xác.', {
          cause: loginError,
        });
      }
      if (code === 'auth/invalid-email') {
        throw new Error('Định dạng email không hợp lệ.', { cause: loginError });
      }
      throw new Error('Đã xảy ra lỗi khi đăng nhập.', { cause: loginError });
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    if (isDemoMode) {
      localStorage.removeItem('worklog_demo_session');
      setUser(null);
      setLoading(false);
      return;
    }
    if (!auth) {
      setLoading(false);
      throw new Error('Firebase Auth chưa sẵn sàng.');
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (logoutError: unknown) {
      throw new Error('Không thể đăng xuất. Vui lòng thử lại.', {
        cause: logoutError,
      });
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    if (firebaseState.status === 'error') {
      window.location.reload();
      return;
    }
    setRetryVersion((version) => version + 1);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, profileWarning, login, logout, retry }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function profileFromFirebaseUser(firebaseUser: FirebaseUser): UserProfile {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName:
      firebaseUser.displayName ??
      firebaseUser.email?.split('@')[0] ??
      'Người dùng',
    photoURL: firebaseUser.photoURL ?? undefined,
  };
}
