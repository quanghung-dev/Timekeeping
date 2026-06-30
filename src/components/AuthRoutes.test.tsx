import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const retry = vi.fn();

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    initializationError: 'Không thể khởi tạo Neon.',
    loginError: null,
    retry,
  }),
}));

describe('ProtectedRoute', () => {
  it('blocks navigation and displays the initialization error', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>private content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Không thể khởi tạo Neon.')).toBeInTheDocument();
    expect(screen.queryByText('private content')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
