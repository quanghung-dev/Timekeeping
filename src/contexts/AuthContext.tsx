import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import { neonClient } from '../lib/neonClient';
import type { UserProfile } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vì lưu token trong memory nên mỗi lần load trang (F5) ban đầu 
  // chắc chắn là chưa đăng nhập. 
  // Chỉ kiểm tra session nếu bạn có logic hydrate từ backend/cookies.
  // Nhưng theo plan: F5 -> Logout. Do đó, loading = false ngay từ đầu.
  useEffect(() => {
    // Nếu có logic silent refresh, sẽ đặt ở đây.
    // Hiện tại:
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await neonClient.signIn(email, password);
      // Khi login thành công, tạo/lấy profile thông qua API hoặc trực tiếp 
      // Nhưng theo Q&A, frontend tự tạo profile ở lần đầu.
      // Dùng query kiểm tra
      const userId = response.user?.id || response.user?.email;
      const displayName = response.user?.name || email.split('@')[0];

      if (!userId) {
         throw new Error("Không lấy được userId từ Auth");
      }

      // Lấy Profile
      const profiles = await neonClient.query<any>(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );

      let profileData;

      if (profiles && profiles.length > 0) {
        profileData = profiles[0];
      } else {
        // Tự tạo profile
        const insertRes = await neonClient.query(
          'INSERT INTO profiles (user_id, display_name) VALUES ($1, $2) RETURNING *',
          [userId, displayName]
        );
        profileData = insertRes[0];
      }

      setUser({
        uid: userId,
        email: email,
        displayName: profileData.display_name,
        photoURL: profileData.avatar_url,
      });

    } catch (err: any) {
      const message = err.message || 'Đăng nhập thất bại.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    neonClient.logout();
    setUser(null);
  };

  const retry = () => {
    // Với Neon Auth trong bộ nhớ, không có init async
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        profileWarning: null, // Bỏ warning của firebase
        login,
        logout,
        retry
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
