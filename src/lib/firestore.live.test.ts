import { describe, expect, it, vi } from 'vitest';

const { getDoc } = vi.hoisted(() => ({
  getDoc: vi.fn().mockRejectedValue(new Error('network down')),
}));

vi.mock('./firebase', () => ({
  isDemoMode: false,
  db: {},
  firebaseState: { status: 'ready' },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc,
  getDocs: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
}));

import { getUserSettings } from './firestore';

describe('Firebase persistence', () => {
  it('propagates settings network failures instead of returning defaults', async () => {
    await expect(getUserSettings('user-1')).rejects.toThrow('network down');
  });
});
