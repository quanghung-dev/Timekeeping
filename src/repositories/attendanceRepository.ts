import { mapAttendance, mapAttendanceList, unwrap } from '../lib/databaseMappers';
import { neon } from '../lib/neon';
import type { AttendanceRecord } from '../types';

type AttendanceChanges = Pick<
  AttendanceRecord,
  'checkIn' | 'checkOut' | 'totalHours' | 'status' | 'note' | 'updatedAt'
>;

function toRow(record: Omit<AttendanceRecord, 'id'>) {
  return {
    user_id: record.userId,
    date: record.date,
    check_in: record.checkIn,
    check_out: record.checkOut ?? null,
    total_hours: record.totalHours ?? null,
    status: record.status as 'work' | 'leave' | 'off',
    note: record.note ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export const attendanceRepository = {
  async list(userId: string) {
    const rows = unwrap(
      await neon
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      'Không thể tải lịch sử chấm công.',
    );
    return mapAttendanceList(rows);
  },

  async create(record: Omit<AttendanceRecord, 'id'>) {
    const rows = unwrap(
      await neon.from('attendance_records').insert(toRow(record)).select('*'),
      'Không thể tạo bản ghi chấm công.',
    );
    if (!rows[0]) throw new Error('Không thể tạo bản ghi chấm công.');
    return mapAttendance(rows[0]);
  },

  async update(userId: string, date: string, changes: AttendanceChanges) {
    const rows = unwrap(
      await neon
        .from('attendance_records')
        .update({
          check_in: changes.checkIn,
          check_out: changes.checkOut ?? null,
          total_hours: changes.totalHours ?? null,
          status: changes.status as 'work' | 'leave' | 'off',
          note: changes.note ?? null,
          updated_at: changes.updatedAt,
        })
        .eq('user_id', userId)
        .eq('date', date)
        .select('*'),
      'Không thể cập nhật bản ghi chấm công.',
    );
    if (!rows[0]) throw new Error('Không thể cập nhật bản ghi chấm công.');
    return mapAttendance(rows[0]);
  },

  async remove(userId: string, date: string): Promise<void> {
    const result = await neon
      .from('attendance_records')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
    if (result.error) {
      throw new Error(`Không thể xóa bản ghi chấm công: ${result.error.message}`);
    }
  },
};
