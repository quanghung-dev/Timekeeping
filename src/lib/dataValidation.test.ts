import { describe, expect, it } from 'vitest';
import {
  parseAttendanceRecord,
  parseAttendanceRecords,
  parseUserSettings,
} from './dataValidation';

const validRecord = {
  userId: 'user-1',
  date: '2026-06-20',
  checkIn: '08:00',
  checkOut: '17:00',
  totalHours: 9,
  status: 'work' as const,
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

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

  it('rejects invalid calendar dates', () => {
    expect(() =>
      parseAttendanceRecord({ ...validRecord, date: '2026-02-31' }),
    ).toThrow('Dữ liệu chấm công không hợp lệ');
  });

  it('rejects total hours when checkout is missing', () => {
    expect(() =>
      parseAttendanceRecord({
        ...validRecord,
        checkOut: undefined,
        totalHours: 8,
      }),
    ).toThrow('Dữ liệu chấm công không hợp lệ');
  });

  it('rejects total hours that contradict the recorded times', () => {
    expect(() =>
      parseAttendanceRecord({ ...validRecord, totalHours: 7 }),
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

  it('rejects targets above 24 hours per day', () => {
    expect(() =>
      parseUserSettings({
        userId: 'user-1',
        salaryType: 'hourly',
        salaryAmount: 50000,
        workHoursPerDay: 25,
        theme: 'light',
        updatedAt: '2026-06-20T00:00:00.000Z',
      }),
    ).toThrow('Cấu hình người dùng không hợp lệ');
  });
});
