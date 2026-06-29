import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => {
    throw new Error('invalid firebase config');
  }),
}));

vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn() }));

describe('firebase initialization', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails closed instead of switching to Demo Mode', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'configured-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'example.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'example');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app-id');

    const firebase = await import('./firebase');

    expect(firebase.isDemoMode).toBe(false);
    expect(firebase.firebaseState).toMatchObject({
      status: 'error',
      message: expect.stringContaining('Firebase'),
    });
  });
});
