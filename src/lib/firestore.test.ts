import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({
  isDemoMode: true,
  db: null,
  firebaseState: { status: 'demo' },
}));

import { getAttendanceLogs, getUserSettings } from './firestore';

describe('Demo persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports corrupt attendance storage as a recoverable data error', async () => {
    localStorage.setItem('worklog_attendance_user-1', '{broken-json');

    await expect(getAttendanceLogs('user-1')).rejects.toThrow(
      'Dữ liệu chấm công lưu trên thiết bị đã bị hỏng',
    );
  });

  it('creates defaults owned by the requested user', async () => {
    const result = await getUserSettings('user-1');

    expect(result.userId).toBe('user-1');
  });

  it('seeds valid attendance records for a new Demo user', async () => {
    const result = await getAttendanceLogs('user-1');

    expect(result).toHaveLength(25);
    expect(result.every((item) => item.userId === 'user-1')).toBe(true);
  });
});
