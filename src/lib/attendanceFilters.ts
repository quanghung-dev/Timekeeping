import type { AttendanceRecord } from '../types';

export function matchesAttendanceSearch(
  record: AttendanceRecord,
  searchTerm: string,
): boolean {
  return (record.note ?? '')
    .toLowerCase()
    .includes(searchTerm.trim().toLowerCase());
}
