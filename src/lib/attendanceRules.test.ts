import { describe, expect, it } from 'vitest';
import type { AttendanceRecord, UserSettings } from '../types';
import {
  calculateAttendanceSummary,
  calculateWorkStreak,
  classifyTargetHours,
  findCheckoutRecord,
  validateAttendanceRecord,
} from './attendanceRules';

const record = (
  date: string,
  overrides: Partial<AttendanceRecord> = {},
): AttendanceRecord => ({
  userId: 'user-1',
  date,
  checkIn: '08:00',
  checkOut: '17:00',
  totalHours: 9,
  status: 'work',
  note: '',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const settings: UserSettings = {
  userId: 'user-1',
  salaryType: 'hourly',
  salaryAmount: 50_000,
  workHoursPerDay: 8,
  theme: 'light',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('validateAttendanceRecord', () => {
  it('rejects a future work date', () => {
    expect(() =>
      validateAttendanceRecord(record('2026-06-30'), '2026-06-29'),
    ).toThrow('Không thể ghi nhận chấm công cho ngày ở tương lai');
  });

  it('rejects an invalid calendar date', () => {
    expect(() =>
      validateAttendanceRecord(record('2026-02-30'), '2026-06-29'),
    ).toThrow('Ngày chấm công không hợp lệ');
  });

  it('removes work-time fields from leave records', () => {
    const result = validateAttendanceRecord(
      record('2026-06-20', { status: 'leave' }),
      '2026-06-29',
    );

    expect(result.checkIn).toBe('');
    expect(result.checkOut).toBeUndefined();
    expect(result.totalHours).toBeUndefined();
  });
});

describe('findCheckoutRecord', () => {
  it('prefers an open shift from today', () => {
    const yesterday = record('2026-06-28', { checkOut: undefined, totalHours: undefined });
    const today = record('2026-06-29', { checkOut: undefined, totalHours: undefined });

    expect(findCheckoutRecord([yesterday, today], '2026-06-29')?.date).toBe('2026-06-29');
  });

  it('selects the latest earlier open shift after midnight', () => {
    const old = record('2026-06-27', { checkOut: undefined, totalHours: undefined });
    const latest = record('2026-06-28', { checkOut: undefined, totalHours: undefined });

    expect(findCheckoutRecord([old, latest], '2026-06-29')?.date).toBe('2026-06-28');
  });
});

describe('calculateWorkStreak', () => {
  it('counts completed weekdays and skips a weekend', () => {
    const records = [
      record('2026-06-25'),
      record('2026-06-26'),
      record('2026-06-29'),
    ];

    expect(calculateWorkStreak(records, '2026-06-29')).toBe(3);
  });

  it('does not count an incomplete work record', () => {
    expect(
      calculateWorkStreak(
        [record('2026-06-29', { checkOut: undefined, totalHours: undefined })],
        '2026-06-29',
      ),
    ).toBe(0);
  });
});

describe('calculateAttendanceSummary', () => {
  it('uses completed work shifts for averages and hourly salary', () => {
    const result = calculateAttendanceSummary(
      [
        record('2026-06-27', { totalHours: 8 }),
        record('2026-06-28', { checkOut: undefined, totalHours: undefined }),
      ],
      settings,
    );

    expect(result.completedDays).toBe(1);
    expect(result.totalHours).toBe(8);
    expect(result.averageHoursPerDay).toBe(8);
    expect(result.estimatedSalary).toBe(400_000);
  });
});

describe('classifyTargetHours', () => {
  it.each([
    [7, 8, 'below'],
    [8, 8, 'met'],
    [9, 8, 'above'],
  ] as const)('classifies %s hours against %s', (hours, target, expected) => {
    expect(classifyTargetHours(hours, target)).toBe(expected);
  });
});
