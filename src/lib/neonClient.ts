export class NeonAuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NeonAuthError';
    this.status = status;
  }
}

export class NeonDataError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'NeonDataError';
    this.status = status;
  }
}

// In-memory storage for JWT
let currentToken: string | null = null;
let currentUserId: string | null = null;

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL;
const NEON_DATA_URL = import.meta.env.VITE_NEON_DATA_API_URL;

if (!NEON_AUTH_URL || !NEON_DATA_URL) {
  console.error("Thiếu cấu hình VITE_NEON_AUTH_URL hoặc VITE_NEON_DATA_API_URL. Hệ thống sẽ khóa toàn bộ thao tác.");
}

export const neonClient = {
  /**
   * Đăng nhập với Neon Auth / Better Auth
   * Giả định API endpoint là /api/auth/sign-in/email
   */
  signIn: async (email: string, password: string) => {
    if (!NEON_AUTH_URL) throw new NeonAuthError('Thiếu cấu hình Auth');

    try {
      const response = await fetch(`${NEON_AUTH_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new NeonAuthError('Email hoặc mật khẩu không đúng', response.status);
      }

      const data = await response.json();
      
      // Giả định response trả về token và user object
      if (!data.token) {
        throw new NeonAuthError('Không nhận được token từ server');
      }

      currentToken = data.token;
      currentUserId = data.user?.id || data.user?.email || 'unknown_user';
      
      return { token: currentToken, user: data.user };
    } catch (err: any) {
      if (err instanceof NeonAuthError) throw err;
      throw new NeonAuthError(err.message || 'Lỗi mạng khi đăng nhập');
    }
  },

  logout: () => {
    currentToken = null;
    currentUserId = null;
    // Không lưu gì trong localStorage
  },

  getToken: () => currentToken,
  getUserId: () => currentUserId,

  /**
   * Thực thi câu lệnh SQL qua Neon Data API (HTTP)
   * Sử dụng Bearer token (JWT) để authenticate và áp dụng RLS.
   */
  query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    if (!NEON_DATA_URL) throw new NeonDataError('Thiếu cấu hình Data API');
    if (!currentToken) throw new NeonAuthError('Chưa đăng nhập (thiếu session)', 401);

    try {
      const response = await fetch(NEON_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        // Neon HTTP driver format: { query: string, params: array }
        body: JSON.stringify({ query: sql, params }),
      });

      if (response.status === 401) {
        neonClient.logout();
        throw new NeonAuthError('Phiên đăng nhập hết hạn', 401);
      }
      
      if (response.status === 403) {
        throw new NeonDataError('Không có quyền truy cập dữ liệu (403)', 403);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new NeonDataError(`Lỗi CSDL: ${errText}`, response.status);
      }

      const result = await response.json();
      // Neon return format có thể là result.rows
      return (result.rows || result) as T[];
    } catch (err: any) {
      if (err instanceof NeonAuthError || err instanceof NeonDataError) throw err;
      throw new NeonDataError(err.message || 'Lỗi mạng hoặc server không phản hồi');
    }
  }
};
