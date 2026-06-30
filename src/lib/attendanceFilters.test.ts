import { describe, expect, it } from 'vitest';
import type { AttendanceRecord } from '../types';
import { matchesAttendanceSearch } from './attendanceFilters';

const record: AttendanceRecord = {
  userId: 'u1',
  date: '2026-07-01',
  checkIn: '08:00',
  checkOut: '17:00',
  totalHours: 9,
  status: 'work',
  createdAt: '2026-07-01T01:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

describe('matchesAttendanceSearch', () => {
  it('does not match a missing note when a keyword is present', () => {
    expect(matchesAttendanceSearch(record, 'meeting')).toBe(false);
  });

  it('matches every note when the keyword is empty', () => {
    expect(matchesAttendanceSearch(record, '')).toBe(true);
  });

  it('matches notes without case sensitivity or outer keyword spaces', () => {
    expect(
      matchesAttendanceSearch({ ...record, note: 'Client Meeting' }, ' meeting '),
    ).toBe(true);
  });
});
