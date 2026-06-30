import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from './Settings';

const mocks = vi.hoisted(() => ({
  settings: {
    userId: 'u1',
    salaryType: 'hourly' as const,
    salaryAmount: 50000,
    workHoursPerDay: 8,
    theme: 'light' as const,
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  saving: false,
  updateSettings: vi.fn(),
  refetch: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../hooks/useSettingsData', () => ({
  useSettingsData: () => ({
    settings: mocks.settings,
    loading: false,
    saving: mocks.saving,
    error: null,
    updateSettings: mocks.updateSettings,
    refetch: mocks.refetch,
  }),
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'u@example.com', displayName: 'User' },
    logout: mocks.logout,
  }),
}));

vi.mock('../repositories/profileRepository', () => ({
  profileRepository: { updateDisplayName: vi.fn() },
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saving = false;
    mocks.settings = {
      userId: 'u1',
      salaryType: 'hourly',
      salaryAmount: 50000,
      workHoursPerDay: 8,
      theme: 'light',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
  });

  it('disables the settings submit button while saving', () => {
    mocks.saving = true;
    render(<Settings />);

    expect(
      screen.getByRole('button', { name: 'Lưu cấu hình cài đặt' }),
    ).toBeDisabled();
  });

  it('synchronizes local form values after server settings change', async () => {
    const user = userEvent.setup();
    const view = render(<Settings />);
    const salaryInput = screen.getByLabelText('Mức lương mỗi giờ (VNĐ/giờ)');
    await user.clear(salaryInput);
    await user.type(salaryInput, '75000');

    mocks.settings = {
      ...mocks.settings,
      salaryAmount: 60000,
      updatedAt: '2026-07-01T01:00:00.000Z',
    };
    view.rerender(<Settings />);

    expect(salaryInput).toHaveValue(60000);
  });

  it('provides a mobile logout action', async () => {
    const user = userEvent.setup();
    mocks.logout.mockResolvedValue(undefined);
    render(<Settings />);

    await user.click(
      screen.getByRole('button', { name: 'Đăng xuất trên thiết bị này' }),
    );

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });
});
