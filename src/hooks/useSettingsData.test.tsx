import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsData } from './useSettingsData';

const { getUserSettings, setTheme } = vi.hoisted(() => ({
  getUserSettings: vi.fn(),
  setTheme: vi.fn(),
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({ user: { uid: 'user-1' } }),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ setTheme }),
}));

vi.mock('../lib/firestore', () => ({
  getUserSettings,
  saveUserSettings: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('useSettingsData', () => {
  it('exposes a retryable settings load error without fake defaults', async () => {
    getUserSettings.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useSettingsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBe('network down');
    expect(result.current.refetch).toEqual(expect.any(Function));
  });
});
