import type {
  AttendanceRecord,
  AttendanceSummary,
  UserSettings,
} from '../types';
import { calculateTotalHours } from './time';

export type TargetHoursStatus = 'below' | 'met' | 'above';

export type AttendanceAction =
  | { kind: 'check-in' }
  | { kind: 'check-out'; record: AttendanceRecord }
  | { kind: 'closed'; record: AttendanceRecord };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseLocalDate(date: string): Date {
  if (!datePattern.test(date)) {
    throw new Error('Ngày chấm công không hợp lệ');
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error('Ngày chấm công không hợp lệ');
  }
  return parsed;
}

function isCompletedWork(record: AttendanceRecord): boolean {
  return (
    record.status === 'work' &&
    Boolean(record.checkIn) &&
    Boolean(record.checkOut) &&
    Number.isFinite(record.totalHours) &&
    (record.totalHours ?? 0) > 0
  );
}

export function validateAttendanceRecord(
  record: AttendanceRecord,
  today: string,
): AttendanceRecord {
  parseLocalDate(record.date);
  parseLocalDate(today);
  if (record.date > today) {
    throw new Error('Không thể ghi nhận chấm công cho ngày ở tương lai');
  }
  if (!record.userId.trim()) {
    throw new Error('Người dùng không hợp lệ');
  }
  if (!['work', 'leave', 'off'].includes(record.status)) {
    throw new Error('Trạng thái chấm công không hợp lệ');
  }

  if (record.status !== 'work') {
    return {
      ...record,
      checkIn: '',
      checkOut: undefined,
      totalHours: undefined,
    };
  }

  if (!record.checkIn) {
    throw new Error('Giờ bắt đầu không hợp lệ');
  }

  if (!record.checkOut) {
    // Validate the check-in format without inventing a checkout value.
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(record.checkIn)) {
      throw new Error('Thời gian không hợp lệ');
    }
    return { ...record, checkOut: undefined, totalHours: undefined };
  }

  return {
    ...record,
    totalHours: calculateTotalHours(record.checkIn, record.checkOut),
  };
}

export function findCheckoutRecord(
  records: AttendanceRecord[],
  today: string,
): AttendanceRecord | null {
  parseLocalDate(today);
  const openRecords = records
    .filter(
      (item) =>
        item.status === 'work' &&
        Boolean(item.checkIn) &&
        !item.checkOut &&
        item.date <= today,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return openRecords[0] ?? null;
}

export function resolveAttendanceAction(
  todayRecord: AttendanceRecord | null,
  checkoutRecord: AttendanceRecord | null,
): AttendanceAction {
  if (checkoutRecord) return { kind: 'check-out', record: checkoutRecord };
  if (todayRecord) return { kind: 'closed', record: todayRecord };
  return { kind: 'check-in' };
}

export function calculateCheckoutHours(
  record: AttendanceRecord,
  checkoutAt: Date,
): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(record.checkIn)) {
    throw new Error('Thời gian không hợp lệ');
  }

  const startDate = parseLocalDate(record.date);
  const [hours, minutes] = record.checkIn.split(':').map(Number);
  startDate.setHours(hours, minutes, 0, 0);

  const durationMinutes = (checkoutAt.getTime() - startDate.getTime()) / 60_000;
  if (durationMinutes <= 0) {
    throw new Error('Giờ Check Out phải sau Check In.');
  }
  if (durationMinutes > 24 * 60) {
    throw new Error('Ca làm đã mở quá 24 giờ. Vui lòng chỉnh sửa thủ công.');
  }

  return Math.round((durationMinutes / 60) * 100) / 100;
}

export function calculateWorkStreak(
  records: AttendanceRecord[],
  today: string,
): number {
  const completedDates = new Set(
    records.filter(isCompletedWork).map((item) => item.date),
  );
  if (completedDates.size === 0) return 0;

  const cursor = parseLocalDate(today);
  if (!completedDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    while (cursor.getDay() === 0 || cursor.getDay() === 6) {
      cursor.setDate(cursor.getDate() - 1);
    }
    const candidate = formatLocalDate(cursor);
    if (!completedDates.has(candidate)) return 0;
  }

  let streak = 0;
  for (let remaining = 0; remaining < 366; remaining += 1) {
    const day = cursor.getDay();
    const date = formatLocalDate(cursor);
    if (day === 0 || day === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!completedDates.has(date)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAttendanceSummary(
  records: AttendanceRecord[],
  settings: UserSettings,
): AttendanceSummary {
  const completed = records.filter(isCompletedWork);
  const totalHours = completed.reduce(
    (sum, item) => sum + (item.totalHours ?? 0),
    0,
  );
  const completedDays = completed.length;
  const estimatedSalary =
    settings.salaryType === 'daily'
      ? completedDays * settings.salaryAmount
      : totalHours * settings.salaryAmount;

  return {
    workDays: records.filter((item) => item.status === 'work').length,
    completedDays,
    leaveDays: records.filter((item) => item.status === 'leave').length,
    offDays: records.filter((item) => item.status === 'off').length,
    totalHours,
    averageHoursPerDay: completedDays > 0 ? totalHours / completedDays : 0,
    estimatedSalary,
  };
}

export function classifyTargetHours(
  totalHours: number,
  target: number,
): TargetHoursStatus {
  if (!Number.isFinite(totalHours) || !Number.isFinite(target) || target <= 0) {
    throw new Error('Định mức giờ làm không hợp lệ');
  }
  if (totalHours < target) return 'below';
  if (totalHours > target) return 'above';
  return 'met';
}
