import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAttendanceData } from './useAttendanceData';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  user: { uid: 'u1', email: 'u@example.com', displayName: 'User' },
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    user: mocks.user,
  }),
}));

vi.mock('../repositories/attendanceRepository', () => ({
  attendanceRepository: mocks,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('useAttendanceData mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([]);
  });

  it('rejects saveRecord when the repository rejects', async () => {
    mocks.create.mockRejectedValue(new Error('database unavailable'));
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() =>
        result.current.saveRecord(
          '2026-06-29',
          '08:00',
          '17:00',
          'work',
          'note remains',
        ),
      ),
    ).rejects.toThrow('database unavailable');
  });

  it('rejects deleteRecord when the repository rejects', async () => {
    mocks.remove.mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() => result.current.deleteRecord('2026-06-29')),
    ).rejects.toThrow('delete failed');
  });
});
