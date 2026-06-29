import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './auth-context';

vi.mock('../lib/firebase', () => ({
  isDemoMode: false,
  auth: null,
  db: null,
  firebaseState: {
    status: 'error',
    message: 'Không thể khởi tạo Firebase.',
  },
}));

const Probe = () => {
  const value = useAuth() as unknown as {
    loading: boolean;
    error: string | null;
  };
  return <div>{value.loading ? 'loading' : value.error ?? 'ready'}</div>;
};

describe('AuthProvider', () => {
  it('surfaces a configured Firebase initialization failure', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Không thể khởi tạo Firebase.')).toBeVisible();
  });
});
