import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { formatDateISO, calculateTotalHours } from '../lib/utils';
import { findCheckoutRecord } from '../lib/attendanceRules';
import toast from 'react-hot-toast';

export function useAttendanceData() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setRecords(await attendanceRepository.list(user.uid));
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

      await attendanceRepository.create({
        userId: user.uid,
        date: todayStr,
        checkIn: checkInTime,
        status: 'work',
        note,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await fetchRecords();
      toast.success('Chấm công vào (Check In) thành công! ▶');
    } catch (err: unknown) {
      const normalized = err instanceof Error ? err : new Error('Lỗi kết nối');
      toast.error('Chấm công thất bại: ' + normalized.message);
      throw normalized;
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

      await attendanceRepository.update(user.uid, checkoutRecord.date, {
        checkIn: checkoutRecord.checkIn,
        checkOut: checkOutTime,
        totalHours: hours,
        status: checkoutRecord.status,
        note: mergedNote,
        updatedAt: nowIso,
      });

      await fetchRecords();
      toast.success('Chấm công ra (Check Out) thành công! ■');
    } catch (err: unknown) {
      const normalized = err instanceof Error ? err : new Error('Lỗi kết nối');
      toast.error('Chấm công thất bại: ' + normalized.message);
      throw normalized;
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
        await attendanceRepository.update(user.uid, date, {
          checkIn: dbCheckIn,
          checkOut: dbCheckOut ?? undefined,
          totalHours: dbTotalHours ?? undefined,
          status,
          note,
          updatedAt: nowIso,
        });
      } else {
        await attendanceRepository.create({
          userId: user.uid,
          date,
          checkIn: dbCheckIn,
          checkOut: dbCheckOut ?? undefined,
          totalHours: dbTotalHours ?? undefined,
          status,
          note,
          createdAt,
          updatedAt: nowIso,
        });
      }

      await fetchRecords();
      toast.success('Đã lưu bản ghi chấm công.');
    } catch (err: unknown) {
      const normalized = err instanceof Error ? err : new Error('Lỗi mạng');
      toast.error('Không thể lưu bản ghi: ' + normalized.message);
      throw normalized;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteRecord = async (date: string): Promise<void> => {
    if (!user) return;
    try {
      setActionLoading(true);
      await attendanceRepository.remove(user.uid, date);
      await fetchRecords();
      toast.success('Đã xóa bản ghi chấm công.');
    } catch (err: unknown) {
      const normalized = err instanceof Error ? err : new Error('Lỗi mạng');
      toast.error('Không thể xóa bản ghi: ' + normalized.message);
      throw normalized;
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
