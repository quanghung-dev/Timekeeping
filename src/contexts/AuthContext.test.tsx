import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './auth-context';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  ensureProfile: vi.fn(),
}));

vi.mock('../lib/neon', () => ({
  getNeonClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { ensure: mocks.ensureProfile },
}));

const user = {
  id: 'u1',
  email: 'u@example.com',
  name: 'User',
};

const profile = {
  uid: 'u1',
  email: 'u@example.com',
  displayName: 'User',
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.ensureProfile.mockResolvedValue(profile);
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('hydrates an existing SDK session after reload', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(profile);
    expect(mocks.ensureProfile).toHaveBeenCalledWith(user);
  });

  it('keeps invalid credentials as a recoverable login error', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: new Error('Email hoặc mật khẩu không đúng'),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.login('u@example.com', 'wrong-password');
      } catch (error: unknown) {
        thrown = error;
      }
    });

    expect(thrown).toEqual(new Error('Email hoặc mật khẩu không đúng'));
    expect(result.current.loginError).toBe('Email hoặc mật khẩu không đúng');
    expect(result.current.initializationError).toBeNull();
  });

  it('clears a previous login error before a successful retry', async () => {
    mocks.signInWithPassword
      .mockResolvedValueOnce({
        data: { session: null, user: null },
        error: new Error('Sai mật khẩu'),
      })
      .mockResolvedValueOnce({
        data: { session: { user }, user },
        error: null,
      });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.login('u@example.com', 'wrong-password')),
    ).rejects.toThrow('Sai mật khẩu');
    await act(() => result.current.login('u@example.com', 'correct-password'));

    expect(result.current.loginError).toBeNull();
    expect(result.current.user).toEqual(profile);
  });

  it('signs out through the SDK and clears the user', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user } },
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(profile));

    await act(() => result.current.logout());

    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
  });
});
