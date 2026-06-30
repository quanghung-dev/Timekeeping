import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginError: 'Email hoặc mật khẩu không đúng',
  }),
}));

describe('Login', () => {
  it('shows a recoverable login error without replacing the form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Email hoặc mật khẩu không đúng',
    );
    expect(screen.getByLabelText('Email đăng nhập')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
  });
});
