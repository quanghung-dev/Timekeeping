import { isDemoMode, db } from './firebase';
import type { AttendanceRecord, UserSettings } from '../types';
import { generateMockAttendance, DEFAULT_SETTINGS } from './mockData';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';

// Helper to simulate network latency for a smoother, realistic UI experience in Demo Mode
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to enforce a timeout on Firestore operations (in case network is offline/blocked)
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 6000,
  errorMsg: string = 'Kết nối cơ sở dữ liệu hết thời gian chờ.'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
};


/**
 * Fetch all attendance records for a user
 */
export async function getAttendanceLogs(userId: string): Promise<AttendanceRecord[]> {
  if (isDemoMode) {
    await delay(500); // slightly longer delay for initial load
    const storageKey = `worklog_attendance_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return JSON.parse(stored);
    } else {
      const mockRecords = generateMockAttendance(userId);
      localStorage.setItem(storageKey, JSON.stringify(mockRecords));
      return mockRecords;
    }
  }

  // Real Firestore implementation
  try {
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', userId)
    );
    const querySnapshot = await withTimeout(
      getDocs(q),
      6000,
      'Không thể tải lịch sử chấm công (Hết thời gian chờ).'
    );
    const records: AttendanceRecord[] = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
    });
    // Sort in memory to avoid requiring Firebase composite indexes
    return records.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching attendance from Firestore:", error);
    throw error;
  }
}

/**
 * Add or update an attendance record (Check-in, Check-out, or manual edits)
 */
export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  if (isDemoMode) {
    await delay(300);
    const storageKey = `worklog_attendance_${record.userId}`;
    const stored = localStorage.getItem(storageKey);
    let records: AttendanceRecord[] = stored ? JSON.parse(stored) : [];
    
    const index = records.findIndex(r => r.date === record.date);
    if (index >= 0) {
      records[index] = { ...records[index], ...record, updatedAt: new Date().toISOString() };
    } else {
      records.push({ ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    // Keep it sorted by date
    records.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(storageKey, JSON.stringify(records));
    return;
  }

  // Real Firestore implementation
  // Document ID is composed of userId_date to enforce 1 record per day rule
  try {
    const docId = `${record.userId}_${record.date}`;
    const docRef = doc(db, 'attendance', docId);
    await withTimeout(
      setDoc(docRef, {
        ...record,
        updatedAt: new Date().toISOString()
      }, { merge: true }),
      6000,
      'Không thể lưu thông tin chấm công (Hết thời gian chờ).'
    );
  } catch (error) {
    console.error("Error saving attendance to Firestore:", error);
    throw error;
  }
}

/**
 * Delete an attendance record
 */
export async function deleteAttendanceRecord(userId: string, date: string): Promise<void> {
  if (isDemoMode) {
    await delay(300);
    const storageKey = `worklog_attendance_${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      let records: AttendanceRecord[] = JSON.parse(stored);
      records = records.filter(r => r.date !== date);
      localStorage.setItem(storageKey, JSON.stringify(records));
    }
    return;
  }

  // Real Firestore implementation
  try {
    const docId = `${userId}_${date}`;
    await withTimeout(
      deleteDoc(doc(db, 'attendance', docId)),
      6000,
      'Không thể xóa bản ghi chấm công (Hết thời gian chờ).'
    );
  } catch (error) {
    console.error("Error deleting attendance from Firestore:", error);
    throw error;
  }
}

/**
 * Fetch settings for a user
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  if (isDemoMode) {
    await delay(200);
    const storageKey = `worklog_settings_${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  }

  // Real Firestore implementation
  try {
    const docRef = doc(db, 'settings', userId);
    const docSnap = await withTimeout(
      getDoc(docRef),
      6000,
      'Không thể tải cài đặt (Hết thời gian chờ).'
    );
    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    } else {
      // Create and return default settings
      const settings = { ...DEFAULT_SETTINGS, userId };
      await withTimeout(
        setDoc(docRef, settings),
        6000,
        'Không thể khởi tạo cài đặt (Hết thời gian chờ).'
      );
      return settings;
    }
  } catch (error) {
    console.error("Error fetching settings from Firestore:", error);
    return { ...DEFAULT_SETTINGS, userId };
  }
}

/**
 * Update user settings
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  if (isDemoMode) {
    await delay(200);
    const storageKey = `worklog_settings_${settings.userId}`;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    
    // Also store theme preference in global local storage for app initialization
    localStorage.setItem('worklog_theme', settings.theme);
    return;
  }

  // Real Firestore implementation
  try {
    const docRef = doc(db, 'settings', settings.userId);
    await withTimeout(
      setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true }),
      6000,
      'Không thể lưu cài đặt (Hết thời gian chờ).'
    );
    
    localStorage.setItem('worklog_theme', settings.theme);
  } catch (error) {
    console.error("Error saving settings to Firestore:", error);
    throw error;
  }
}
