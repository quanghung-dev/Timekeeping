import { describe, expect, it } from 'vitest';
import { parseAttendanceRecords, parseUserSettings } from './dataValidation';

describe('parseAttendanceRecords', () => {
  it('rejects unsupported attendance statuses', () => {
    expect(() =>
      parseAttendanceRecords([
        {
          userId: 'user-1',
          date: '2026-06-20',
          checkIn: '08:00',
          checkOut: '17:00',
          totalHours: 9,
          status: 'remote',
          createdAt: '2026-06-20T00:00:00.000Z',
          updatedAt: '2026-06-20T00:00:00.000Z',
        },
      ]),
    ).toThrow('Dữ liệu chấm công không hợp lệ');
  });
});

describe('parseUserSettings', () => {
  it('rejects non-positive salary values', () => {
    expect(() =>
      parseUserSettings({
        userId: 'user-1',
        salaryType: 'hourly',
        salaryAmount: 0,
        workHoursPerDay: 8,
        theme: 'light',
        updatedAt: '2026-06-20T00:00:00.000Z',
      }),
    ).toThrow('Cấu hình người dùng không hợp lệ');
  });
});
