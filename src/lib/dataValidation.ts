import { z } from 'zod';
import type { AttendanceRecord, UserProfile, UserSettings } from '../types';
import { calculateTotalHours } from './time';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

const attendanceRecordSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().trim().min(1),
    date: z.string().refine(isValidCalendarDate, 'Invalid calendar date'),
    checkIn: z.string(),
    checkOut: z.string().regex(timePattern).optional(),
    totalHours: z.number().finite().positive().max(24).optional(),
    note: z.string().optional(),
    status: z.enum(['work', 'leave', 'off']),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .superRefine((record, context) => {
    if (record.status === 'work') {
      if (!timePattern.test(record.checkIn)) {
        context.addIssue({ code: 'custom', message: 'Invalid check-in' });
      }
      if (
        (record.checkOut === undefined) !==
        (record.totalHours === undefined)
      ) {
        context.addIssue({ code: 'custom', message: 'Incomplete work duration' });
      }
      if (
        timePattern.test(record.checkIn) &&
        record.checkOut &&
        record.totalHours !== undefined
      ) {
        try {
          const expected = calculateTotalHours(record.checkIn, record.checkOut);
          if (Math.abs(expected - record.totalHours) > 0.01) {
            context.addIssue({ code: 'custom', message: 'Mismatched total hours' });
          }
        } catch {
          context.addIssue({ code: 'custom', message: 'Invalid work duration' });
        }
      }
    } else if (
      record.checkIn !== '' ||
      record.checkOut !== undefined ||
      record.totalHours !== undefined
    ) {
      context.addIssue({ code: 'custom', message: 'Non-work record contains time' });
    }
  });

const userSettingsSchema = z.object({
  userId: z.string().trim().min(1),
  salaryType: z.enum(['daily', 'hourly']),
  salaryAmount: z.number().finite().positive(),
  workHoursPerDay: z.number().finite().min(1).max(24),
  theme: z.enum(['light', 'dark']),
  updatedAt: z.string().min(1),
});

const userProfileSchema = z.object({
  uid: z.string().trim().min(1),
  email: z.string().email(),
  displayName: z.string().trim().min(1),
  photoURL: z.string().url().optional(),
  createdAt: z.string().optional(),
});

export function parseAttendanceRecords(value: unknown): AttendanceRecord[] {
  const result = z.array(attendanceRecordSchema).safeParse(value);
  if (!result.success) {
    throw new Error('Dữ liệu chấm công không hợp lệ.', { cause: result.error });
  }
  return result.data;
}

export function parseAttendanceRecord(value: unknown): AttendanceRecord {
  const result = attendanceRecordSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Dữ liệu chấm công không hợp lệ.', { cause: result.error });
  }
  return result.data;
}

export function parseUserSettings(value: unknown): UserSettings {
  const result = userSettingsSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Cấu hình người dùng không hợp lệ.', { cause: result.error });
  }
  return result.data;
}

export function parseUserProfile(value: unknown): UserProfile {
  const result = userProfileSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Hồ sơ người dùng không hợp lệ.', { cause: result.error });
  }
  return result.data;
}
