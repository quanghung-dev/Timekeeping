import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

const login = vi.fn();

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('../lib/firebase', () => ({
  isDemoMode: false,
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('Login', () => {
  beforeEach(() => {
    login.mockReset();
  });

  it('only offers login for a pre-created account', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByText('Đăng ký ngay')).not.toBeInTheDocument();
    expect(screen.getByText(/tài khoản đã được tạo sẵn/i)).toBeInTheDocument();
  });
});
