import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
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

  it('rejects automatic checkout when the open shift is older than 24 hours', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 2, 6, 0));
    mocks.list.mockResolvedValue([
      {
        id: 'a1',
        userId: 'u1',
        date: '2026-06-30',
        checkIn: '22:00',
        status: 'work',
        note: '',
        createdAt: '2026-06-30T15:00:00.000Z',
        updatedAt: '2026-06-30T15:00:00.000Z',
      },
    ]);
    mocks.update.mockResolvedValue({});
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(act(() => result.current.checkOut())).rejects.toThrow(
      'Ca làm đã mở quá 24 giờ',
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid calendar date before creating a record', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 1, 9, 0));
    mocks.create.mockResolvedValue({});
    const { result } = renderHook(() => useAttendanceData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(() =>
        result.current.saveRecord(
          '2026-02-31',
          '08:00',
          '17:00',
          'work',
          '',
        ),
      ),
    ).rejects.toThrow('Ngày chấm công không hợp lệ');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
