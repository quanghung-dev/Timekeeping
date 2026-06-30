import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../contexts/auth-context', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'u@example.com', displayName: 'User' },
    logout: mocks.logout,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: mocks.toastError },
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows logout failures to the user', async () => {
    const user = userEvent.setup();
    mocks.logout.mockRejectedValue(new Error('Phiên đăng xuất thất bại'));
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Layout />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    expect(mocks.toastError).toHaveBeenCalledWith('Phiên đăng xuất thất bại');
  });
});
