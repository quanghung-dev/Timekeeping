import type { AttendanceRecord, UserSettings } from '../types';
import { calculateTotalHours, formatDateISO } from './utils';

export const DEMO_USER = {
  uid: 'demo-user-123',
  email: 'demo@worklog.app',
  displayName: 'Nguyễn Văn Minh',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', // Beautiful mock avatar
};

export const DEFAULT_SETTINGS: UserSettings = {
  userId: DEMO_USER.uid,
  salaryType: 'hourly',
  salaryAmount: 50000, // 50.000 VNĐ / giờ
  workHoursPerDay: 8,
  theme: 'light',
  updatedAt: new Date().toISOString(),
};

/**
 * Generates 25 attendance records for the current and prior month.
 * Automatically respects weekends (which can be labeled as 'off' or skipped).
 * Seeds this mock data into localStorage.
 */
export function generateMockAttendance(userId: string): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date(); // 2026-06-18
  
  // Let's generate records starting from 35 days ago to yesterday
  // skipping weekends or flagging them as 'off' / 'leave'
  let count = 0;
  let dayOffset = 1;
  
  const notes = [
    'Làm việc tại văn phòng',
    'Làm việc từ xa (WFH)',
    'Tăng ca dự án Alpha',
    'Hoàn thành task đúng hạn',
    'Làm việc nhóm thiết kế UI/UX',
    'Fix bug sprint 3',
    'Họp tiến độ tuần',
    'Hỗ trợ khách hàng triển khai',
  ];

  while (count < 25) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - dayOffset);
    dayOffset++;

    const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = formatDateISO(targetDate);

    let status: 'work' | 'leave' | 'off' | 'empty' = 'work';
    let checkIn = '';
    let checkOut = '';
    let totalHours = 0;
    let note = '';

    if (isWeekend) {
      // 20% chance we log weekend work, 80% it is Rest Day ('off')
      if (Math.random() > 0.8) {
        status = 'work';
        checkIn = '08:30';
        checkOut = '12:00';
        totalHours = calculateTotalHours(checkIn, checkOut);
        note = 'Làm thêm cuối tuần';
        count++;
      } else {
        status = 'off';
        note = 'Nghỉ cuối tuần';
        // We can choose to count weekends as records, or just save them
        // Let's save weekends too, so the calendar looks filled!
        count++;
      }
    } else {
      // Weekday: 90% work, 7% leave, 3% off
      const rand = Math.random();
      if (rand < 0.90) {
        status = 'work';
        // Random checkIn between 07:45 and 08:30
        const startHour = 7 + (Math.random() > 0.7 ? 1 : 0);
        const startMin = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
        checkIn = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

        // Random checkOut between 17:00 and 18:30
        const endHour = 17 + (Math.random() > 0.6 ? 1 : 0);
        const endMin = Math.floor(Math.random() * 4) * 15;
        checkOut = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        totalHours = calculateTotalHours(checkIn, checkOut);
        note = notes[Math.floor(Math.random() * notes.length)];
      } else if (rand < 0.97) {
        status = 'leave';
        note = 'Nghỉ phép năm';
      } else {
        status = 'off';
        note = 'Nghỉ không lương';
      }
      count++;
    }

    records.push({
      userId,
      date: dateStr,
      checkIn,
      checkOut,
      totalHours: totalHours > 0 ? totalHours : undefined,
      status,
      note,
      createdAt: targetDate.toISOString(),
      updatedAt: targetDate.toISOString(),
    });
  }

  // Sort by date ascending
  return records.sort((a, b) => a.date.localeCompare(b.date));
}
