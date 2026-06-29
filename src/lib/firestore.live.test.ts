import { describe, expect, it, vi } from 'vitest';

const { getDoc, setDoc } = vi.hoisted(() => ({
  getDoc: vi.fn().mockRejectedValue(new Error('network down')),
  setDoc: vi.fn().mockResolvedValue(undefined),
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
  setDoc,
  where: vi.fn(),
}));

import { getUserSettings, saveAttendanceRecord } from './firestore';

describe('Firebase persistence', () => {
  it('propagates settings network failures instead of returning defaults', async () => {
    await expect(getUserSettings('user-1')).rejects.toThrow('network down');
  });

  it('does not persist the client-only document id field', async () => {
    await saveAttendanceRecord({
      id: 'user-1_2026-06-29',
      userId: 'user-1',
      date: '2026-06-29',
      checkIn: '08:00',
      checkOut: '17:00',
      totalHours: 9,
      status: 'work',
      createdAt: '2026-06-29T01:00:00.000Z',
      updatedAt: '2026-06-29T10:00:00.000Z',
    });

    expect(setDoc.mock.calls[0]?.[1]).not.toHaveProperty('id');
  });
});
