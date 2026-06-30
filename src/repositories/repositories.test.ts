import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attendanceRepository } from './attendanceRepository';
import { profileRepository } from './profileRepository';
import { settingsRepository } from './settingsRepository';

const sdk = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../lib/neon', () => ({ neon: { from: sdk.from } }));

describe('profileRepository.ensure', () => {
  beforeEach(() => sdk.from.mockReset());

  it('creates a complete first-login profile when none exists', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'u1',
            display_name: 'User',
            avatar_url: null,
            created_at: '2026-06-30T00:00:00.000Z',
            updated_at: '2026-06-30T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    };
    sdk.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain);

    await expect(
      profileRepository.ensure(
        { id: 'u1', email: 'u@example.com', name: 'User' },
        () => new Date('2026-06-30T00:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ uid: 'u1', displayName: 'User' });

    expect(insertChain.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      display_name: 'User',
      avatar_url: null,
      created_at: '2026-06-30T00:00:00.000Z',
      updated_at: '2026-06-30T00:00:00.000Z',
    });
  });

  it('updates the display name and returns a validated profile', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'u1',
            display_name: 'New Name',
            avatar_url: null,
            created_at: '2026-06-30T00:00:00.000Z',
            updated_at: '2026-06-30T10:00:00.000Z',
          },
        ],
        error: null,
      }),
    };
    sdk.from.mockReturnValue(chain);

    await expect(
      profileRepository.updateDisplayName(
        'u1',
        'u@example.com',
        'New Name',
      ),
    ).resolves.toMatchObject({ displayName: 'New Name' });
  });
});

describe('attendanceRepository', () => {
  beforeEach(() => sdk.from.mockReset());

  it('maps and validates rows returned by list', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'a1',
            user_id: 'u1',
            date: '2026-06-30',
            check_in: '08:00',
            check_out: '17:00',
            total_hours: 9,
            status: 'work',
            note: null,
            created_at: '2026-06-30T00:00:00.000Z',
            updated_at: '2026-06-30T09:00:00.000Z',
          },
        ],
        error: null,
      }),
    };
    sdk.from.mockReturnValue(chain);

    await expect(attendanceRepository.list('u1')).resolves.toEqual([
      expect.objectContaining({
        id: 'a1',
        userId: 'u1',
        totalHours: 9,
        note: undefined,
      }),
    ]);
  });

  it('rejects a failed delete instead of reporting success', async () => {
    const eq = vi.fn();
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq,
    };
    eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ data: null, error: { message: 'network down' } });
    sdk.from.mockReturnValue(chain);

    await expect(attendanceRepository.remove('u1', '2026-06-30')).rejects.toThrow(
      'network down',
    );
  });

  it('accepts a successful delete with no response body', async () => {
    const eq = vi.fn();
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq,
    };
    eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ data: null, error: null });
    sdk.from.mockReturnValue(chain);

    await expect(
      attendanceRepository.remove('u1', '2026-06-30'),
    ).resolves.toBeUndefined();
  });

  it('creates and maps an attendance record', async () => {
    const row = attendanceRow();
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [row], error: null }),
    };
    sdk.from.mockReturnValue(chain);

    await expect(
      attendanceRepository.create({
        userId: 'u1',
        date: '2026-06-30',
        checkIn: '08:00',
        checkOut: '17:00',
        totalHours: 9,
        status: 'work',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    ).resolves.toMatchObject({ id: 'a1', totalHours: 9 });
  });

  it('updates and maps an attendance record', async () => {
    const row = attendanceRow({ check_out: '18:00', total_hours: 10 });
    const eq = vi.fn();
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq,
      select: vi.fn().mockResolvedValue({ data: [row], error: null }),
    };
    eq.mockReturnValue(chain);
    sdk.from.mockReturnValue(chain);

    await expect(
      attendanceRepository.update('u1', '2026-06-30', {
        checkIn: '08:00',
        checkOut: '18:00',
        totalHours: 10,
        status: 'work',
        updatedAt: row.updated_at,
      }),
    ).resolves.toMatchObject({ checkOut: '18:00', totalHours: 10 });
  });
});

describe('settingsRepository', () => {
  beforeEach(() => sdk.from.mockReset());

  it('returns null when settings do not exist', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    sdk.from.mockReturnValue(chain);
    await expect(settingsRepository.get('u1')).resolves.toBeNull();
  });

  it('creates validated default settings', async () => {
    const row = settingsRow();
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [row], error: null }),
    };
    sdk.from.mockReturnValue(chain);
    await expect(
      settingsRepository.createDefault(
        'u1',
        () => new Date('2026-06-30T00:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ userId: 'u1', salaryAmount: 50000 });
  });

  it('updates settings and returns the server value', async () => {
    const row = settingsRow({ salary_amount: 75000 });
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [row], error: null }),
    };
    sdk.from.mockReturnValue(chain);
    await expect(
      settingsRepository.update('u1', {
        userId: 'u1',
        salaryType: 'hourly',
        salaryAmount: 75000,
        workHoursPerDay: 8,
        theme: 'light',
        updatedAt: row.updated_at,
      }),
    ).resolves.toMatchObject({ salaryAmount: 75000 });
  });
});

function attendanceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    user_id: 'u1',
    date: '2026-06-30',
    check_in: '08:00',
    check_out: '17:00',
    total_hours: 9,
    status: 'work',
    note: null,
    created_at: '2026-06-30T00:00:00.000Z',
    updated_at: '2026-06-30T09:00:00.000Z',
    ...overrides,
  };
}

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'u1',
    salary_type: 'hourly',
    salary_amount: 50000,
    work_hours_per_day: 8,
    theme: 'light',
    created_at: '2026-06-30T00:00:00.000Z',
    updated_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}
