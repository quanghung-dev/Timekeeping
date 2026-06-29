import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { getAttendanceLogs, saveAttendanceRecord, deleteAttendanceRecord } from '../lib/firestore';
import { formatDateISO, calculateTotalHours } from '../lib/utils';
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
      const data = await getAttendanceLogs(user.uid);
      setRecords(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải lịch sử chấm công.');
      toast.error('Lỗi tải dữ liệu chấm công');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Find today's record (date is YYYY-MM-DD)
  const getTodayStr = () => formatDateISO(new Date());
  const todayRecord = records.find(r => r.date === getTodayStr()) || null;

  // Check In function
  const checkIn = async (note: string = ''): Promise<void> => {
    if (!user) return;
    const todayStr = getTodayStr();
    
    // Validate rules: 1 record per day
    if (todayRecord) {
      toast.error('Bạn đã chấm công vào hôm nay rồi!');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date();
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newRecord: AttendanceRecord = {
        userId: user.uid,
        date: todayStr,
        checkIn: checkInTime,
        status: 'work',
        note,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await saveAttendanceRecord(newRecord);
      await fetchRecords(); // Reload data
      toast.success('Chấm công vào (Check In) thành công! ▶');
    } catch (err: any) {
      toast.error('Chấm công thất bại: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setActionLoading(false);
    }
  };

  // Check Out function
  const checkOut = async (note: string = ''): Promise<void> => {
    if (!user || !todayRecord) {
      toast.error('Bạn cần Check In trước khi Check Out!');
      return;
    }

    if (todayRecord.checkOut) {
      toast.error('Bạn đã hoàn thành chấm công hôm nay!');
      return;
    }

    try {
      setActionLoading(true);
      const now = new Date();
      const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const hours = calculateTotalHours(todayRecord.checkIn, checkOutTime);
      
      const updatedRecord: AttendanceRecord = {
        ...todayRecord,
        checkOut: checkOutTime,
        totalHours: hours,
        note: note || todayRecord.note || '', // merge notes if present
        updatedAt: now.toISOString(),
      };

      await saveAttendanceRecord(updatedRecord);
      await fetchRecords();
      toast.success('Chấm công ra (Check Out) thành công! ■');
    } catch (err: any) {
      toast.error('Chấm công thất bại: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setActionLoading(false);
    }
  };

  // Manual update/create record
  const saveRecord = async (date: string, checkIn: string, checkOut: string, status: AttendanceStatus, note: string): Promise<void> => {
    if (!user) return;
    
    // Prevent logging for future dates
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

      // Check if there is an existing record
      const existing = records.find(r => r.date === date);
      
      const recordToSave: AttendanceRecord = {
        userId: user.uid,
        date,
        checkIn: status === 'work' ? checkIn : '',
        checkOut: status === 'work' ? (checkOut || undefined) : undefined,
        totalHours,
        status,
        note,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveAttendanceRecord(recordToSave);
      await fetchRecords();
      toast.success('Lưu thông tin chấm công thành công!');
    } catch (err: any) {
      toast.error('Không thể lưu thông tin: ' + (err.message || 'Lỗi kết nối'));
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Delete record
  const deleteRecord = async (date: string): Promise<void> => {
    if (!user) return;
    
    try {
      setActionLoading(true);
      await deleteAttendanceRecord(user.uid, date);
      await fetchRecords();
      toast.success('Xóa bản ghi thành công!');
    } catch (err: any) {
      toast.error('Không thể xóa: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setActionLoading(false);
    }
  };

  return {
    records,
    todayRecord,
    loading,
    actionLoading,
    error,
    checkIn,
    checkOut,
    saveRecord,
    deleteRecord,
    refetch: fetchRecords
  };
}
