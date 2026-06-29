import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceRecord } from '../types';
import { useAttendanceData } from './useAttendanceData';

const mocks = vi.hoisted(() => ({
  getAttendanceLogs: vi.fn(),
  saveAttendanceRecord: vi.fn(),
  deleteAttendanceRecord: vi.fn(),
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

vi.mock('../lib/firestore', () => mocks);

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

const openShift: AttendanceRecord = {
  userId: 'user-1',
  date: '2026-06-30',
  checkIn: '23:00',
  status: 'work',
  createdAt: '2026-06-30T16:00:00.000Z',
  updatedAt: '2026-06-30T16:00:00.000Z',
};

describe('useAttendanceData', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 1, 1, 0));
    mocks.getAttendanceLogs.mockResolvedValue([openShift]);
    mocks.saveAttendanceRecord.mockResolvedValue(undefined);
    mocks.deleteAttendanceRecord.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('checks out the latest open shift after midnight', async () => {
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.checkOut();
    });

    expect(mocks.saveAttendanceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-06-30',
        checkOut: '01:00',
        totalHours: 2,
      }),
    );
  });

  it('rejects delete failures so the caller can keep its modal open', async () => {
    mocks.deleteAttendanceRecord.mockRejectedValueOnce(new Error('delete failed'));
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.deleteRecord('2026-06-30')).rejects.toThrow(
      'delete failed',
    );
  });
});
