import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { neonClient } from '../lib/neonClient';
import { formatDateISO, calculateTotalHours } from '../lib/utils';
import { findCheckoutRecord } from '../lib/attendanceRules';
import toast from 'react-hot-toast';

export function useAttendanceData() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mapToCamelCase = (row: Record<string, any>): AttendanceRecord => ({
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalHours: row.total_hours ? Number(row.total_hours) : undefined,
    status: row.status as AttendanceStatus,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await neonClient.query(
        'SELECT * FROM attendance_records WHERE user_id = $1 ORDER BY date DESC',
        [user.uid]
      );
      setRecords(data.map(mapToCamelCase));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử chấm công.';
      setError(msg);
      toast.error('Lỗi tải dữ liệu chấm công');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecords]);

  const getTodayStr = () => formatDateISO(new Date());
  const todayRecord = records.find(r => r.date === getTodayStr()) || null;
  const checkoutRecord = findCheckoutRecord(records, getTodayStr());

  const checkIn = async (note: string = ''): Promise<void> => {
    if (!user) return;
    const todayStr = getTodayStr();
    
    if (todayRecord) {
      toast.error('Bạn đã chấm công vào hôm nay rồi!');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const nowIso = now.toISOString();

      await neonClient.query(
        `INSERT INTO attendance_records 
        (user_id, date, check_in, status, note, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.uid, todayStr, checkInTime, 'work', note, nowIso, nowIso]
      );

      await fetchRecords();
      toast.success('Chấm công vào (Check In) thành công! ▶');
    } catch (err: unknown) {
      toast.error('Chấm công thất bại: ' + (err instanceof Error ? err.message : 'Lỗi kết nối'));
    } finally {
      setActionLoading(false);
    }
  };

  const checkOut = async (note: string = ''): Promise<void> => {
    if (!user || !checkoutRecord) {
      toast.error('Bạn cần Check In trước khi Check Out!');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date();
      const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const hours = calculateTotalHours(checkoutRecord.checkIn, checkOutTime);
      const nowIso = now.toISOString();
      const mergedNote = note || checkoutRecord.note || '';

      await neonClient.query(
        `UPDATE attendance_records 
         SET check_out = $1, total_hours = $2, note = $3, updated_at = $4 
         WHERE user_id = $5 AND date = $6`,
        [checkOutTime, hours, mergedNote, nowIso, user.uid, checkoutRecord.date]
      );

      await fetchRecords();
      toast.success('Chấm công ra (Check Out) thành công! ■');
    } catch (err: unknown) {
      toast.error('Chấm công thất bại: ' + (err instanceof Error ? err.message : 'Lỗi kết nối'));
    } finally {
      setActionLoading(false);
    }
  };

  const saveRecord = async (date: string, checkIn: string, checkOut: string, status: AttendanceStatus, note: string): Promise<void> => {
    if (!user) return;
    
    const todayStr = formatDateISO(new Date());
    if (date > todayStr) {
      toast.error('Không thể ghi nhận chấm công cho ngày ở tương lai!');
      throw new Error('Không thể ghi nhận chấm công cho các ngày trong tương lai.');
    }
    
    try {
      setActionLoading(true);
      
      let totalHours: number | undefined = undefined;
      if (checkIn && checkOut && status === 'work') {
        totalHours = calculateTotalHours(checkIn, checkOut);
      }

      const existing = records.find(r => r.date === date);
      const nowIso = new Date().toISOString();
      const createdAt = existing?.createdAt || nowIso;
      
      const dbCheckOut = status === 'work' ? (checkOut || null) : null;
      const dbCheckIn = status === 'work' ? checkIn : '';
      const dbTotalHours = totalHours !== undefined ? totalHours : null;

      if (existing) {
        await neonClient.query(
          `UPDATE attendance_records 
           SET check_in = $1, check_out = $2, total_hours = $3, status = $4, note = $5, updated_at = $6 
           WHERE user_id = $7 AND date = $8`,
          [dbCheckIn, dbCheckOut, dbTotalHours, status, note, nowIso, user.uid, date]
        );
      } else {
        await neonClient.query(
          `INSERT INTO attendance_records 
           (user_id, date, check_in, check_out, total_hours, status, note, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user.uid, date, dbCheckIn, dbCheckOut, dbTotalHours, status, note, createdAt, nowIso]
        );
      }

      await fetchRecords();
      toast.success('Đã lưu bản ghi chấm công.');
    } catch (err: unknown) {
      toast.error('Không thể lưu bản ghi: ' + (err instanceof Error ? err.message : 'Lỗi mạng'));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteRecord = async (date: string): Promise<void> => {
    if (!user) return;
    try {
      setActionLoading(true);
      await neonClient.query(
        'DELETE FROM attendance_records WHERE user_id = $1 AND date = $2',
        [user.uid, date]
      );
      await fetchRecords();
      toast.success('Đã xóa bản ghi chấm công.');
    } catch (err: unknown) {
      toast.error('Không thể xóa bản ghi: ' + (err instanceof Error ? err.message : 'Lỗi mạng'));
    } finally {
      setActionLoading(false);
    }
  };

  return {
    records,
    loading,
    actionLoading,
    error,
    todayRecord,
    checkoutRecord,
    checkIn,
    checkOut,
    saveRecord,
    deleteRecord,
    refetch: fetchRecords
  };
}
