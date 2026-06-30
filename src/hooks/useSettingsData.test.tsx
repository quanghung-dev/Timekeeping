import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsData } from './useSettingsData';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  createDefault: vi.fn(),
  update: vi.fn(),
  setTheme: vi.fn(),
  user: { uid: 'u1', email: 'u@example.com', displayName: 'User' },
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    user: mocks.user,
  }),
}));

vi.mock('../contexts/theme-context', () => ({
  useTheme: () => ({ setTheme: mocks.setTheme }),
}));

vi.mock('../repositories/settingsRepository', () => ({
  settingsRepository: mocks,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const settings = {
  userId: 'u1',
  salaryType: 'hourly' as const,
  salaryAmount: 50000,
  workHoursPerDay: 8,
  theme: 'light' as const,
  updatedAt: '2026-06-30T00:00:00.000Z',
};

describe('useSettingsData mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(settings);
  });

  it('rejects updateSettings and restores server state after failure', async () => {
    mocks.update.mockRejectedValue(new Error('settings update failed'));
    const { result } = renderHook(() => useSettingsData());
    await waitFor(() => expect(result.current.settings).toEqual(settings));

    await expect(
      act(() => result.current.updateSettings({ salaryAmount: 75000 })),
    ).rejects.toThrow('settings update failed');

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    expect(result.current.settings).toEqual(settings);
  });
});
