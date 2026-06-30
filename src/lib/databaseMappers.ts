import type { AttendanceRecord, UserProfile, UserSettings } from '../types';
import type { AttendanceRow, ProfileRow, SettingsRow } from './database.types';
import {
  parseAttendanceRecord,
  parseAttendanceRecords,
  parseUserProfile,
  parseUserSettings,
} from './dataValidation';

type DataResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export function unwrap<T>(result: DataResult<T>, message: string): T {
  if (result.error) throw new Error(`${message}: ${result.error.message}`);
  if (result.data === null) throw new Error(message);
  return result.data;
}

export function mapProfile(row: ProfileRow, email: string): UserProfile {
  return parseUserProfile({
    uid: row.user_id,
    email,
    displayName: row.display_name,
    photoURL: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  });
}

export function mapAttendance(row: AttendanceRow): AttendanceRecord {
  return parseAttendanceRecord({
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out ?? undefined,
    totalHours:
      row.total_hours === null ? undefined : Number(row.total_hours),
    status: row.status,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function mapAttendanceList(rows: AttendanceRow[]): AttendanceRecord[] {
  return parseAttendanceRecords(rows.map((row) => mapAttendance(row)));
}

export function mapSettings(row: SettingsRow): UserSettings {
  return parseUserSettings({
    userId: row.user_id,
    salaryType: row.salary_type,
    salaryAmount: Number(row.salary_amount),
    workHoursPerDay: Number(row.work_hours_per_day),
    theme: row.theme,
    updatedAt: row.updated_at,
  });
}
