import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDemoMode, auth, db } from '../lib/firebase';
import { DEMO_USER } from '../lib/mockData';
import { withTimeout } from '../lib/firestore';
import type { UserProfile } from '../types';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';


interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    if (isDemoMode) {
      const savedSession = localStorage.getItem('worklog_demo_session');
      if (savedSession) {
        try {
          setUser(JSON.parse(savedSession));
        } catch (e) {
          localStorage.removeItem('worklog_demo_session');
        }
      }
      setLoading(false);
      return;
    }

    // Firebase session management
    if (!auth) {
      setLoading(false);
      return;
    }

    // Safety timeout: if onAuthStateChanged does not fire in 5 seconds, force loading false
    let isResolved = false;
    const safetyTimeout = setTimeout(() => {
      if (!isResolved) {
        console.warn("Work Log: Auth session initialization timed out. Forcing loading false.");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      isResolved = true;
      clearTimeout(safetyTimeout);
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Check for user doc in firestore, or create one if missing
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await withTimeout(
            getDoc(docRef),
            5000,
            'Không thể kết nối đến máy chủ để lấy thông tin hồ sơ.'
          );
          
          let profile: UserProfile;
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nhân viên',
              photoURL: firebaseUser.photoURL || undefined,
            };
          } else {
            // Document does not exist, initialize it
            const defaultName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nhân viên';
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: defaultName,
            };
            
            await withTimeout(
              setDoc(docRef, {
                name: defaultName,
                email: firebaseUser.email,
                createdAt: new Date().toISOString()
              }),
              5000,
              'Không thể tạo cấu hình người dùng.'
            );
          }
          
          setUser(profile);
        } catch (error) {
          console.error("Error synchronizing user profile:", error);
          // Fallback to basic auth info
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Nhân viên',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    
    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Smooth login spinner demo
      if (email === DEMO_USER.email && password === 'demo123') {
        const profile: UserProfile = {
          uid: DEMO_USER.uid,
          email: DEMO_USER.email,
          displayName: DEMO_USER.displayName,
          photoURL: DEMO_USER.photoURL,
        };
        setUser(profile);
        localStorage.setItem('worklog_demo_session', JSON.stringify(profile));
        setLoading(false);
        return;
      } else {
        setLoading(false);
        throw new Error('Tài khoản hoặc mật khẩu demo không chính xác. Hãy nhập demo@worklog.app / demo123');
      }
    }

    // Real Firebase Sign In
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      let friendlyMessage = 'Đã xảy ra lỗi khi đăng nhập.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Tài khoản hoặc mật khẩu không chính xác.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Định dạng email không hợp lệ.';
      }
      setLoading(false);
      throw new Error(friendlyMessage);
    }
  };
  
  const registerUser = async (email: string, password: string, displayName: string): Promise<void> => {
    setLoading(true);
    
    if (isDemoMode) {
      setLoading(false);
      throw new Error('Đăng ký tài khoản không khả dụng trong Chế độ Demo.');
    }

    if (!auth) throw new Error("Firebase Auth is not initialized.");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Initialize user profile document in Firestore
      const docRef = doc(db, 'users', firebaseUser.uid);
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: displayName || email.split('@')[0],
      };
      
      await withTimeout(
        setDoc(docRef, {
          name: profile.displayName,
          email: firebaseUser.email,
          createdAt: new Date().toISOString()
        }),
        5000,
        'Không thể tạo cấu hình người dùng trên máy chủ.'
      );
      
      // Also initialize default settings for this user in Firestore
      const settingsRef = doc(db, 'settings', firebaseUser.uid);
      await withTimeout(
        setDoc(settingsRef, {
          userId: firebaseUser.uid,
          salaryType: 'daily',
          salaryAmount: 200000,
          workHoursPerDay: 8,
          theme: 'light',
          updatedAt: new Date().toISOString()
        }),
        5000,
        'Không thể khởi tạo cấu hình lương mặc định.'
      );

      setUser(profile);
    } catch (err: any) {
      let friendlyMessage = 'Đã xảy ra lỗi khi đăng ký.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Email này đã được sử dụng bởi một tài khoản khác.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Mật khẩu quá yếu. Vui lòng nhập mật khẩu tối thiểu 6 ký tự.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Định dạng email không hợp lệ.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setLoading(false);
      throw new Error(friendlyMessage);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setUser(null);
      localStorage.removeItem('worklog_demo_session');
      setLoading(false);
      return;
    }

    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
