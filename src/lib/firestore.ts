import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import { generateMockAttendance, DEFAULT_SETTINGS } from './mockData';
import {
  parseAttendanceRecord,
  parseAttendanceRecords,
  parseUserSettings,
} from './dataValidation';
import { validateAttendanceRecord } from './attendanceRules';
import { formatDateISO } from './utils';
import type { AttendanceRecord, UserSettings } from '../types';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 6_000,
  errorMsg = 'Kết nối cơ sở dữ liệu hết thời gian chờ.',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function requireDatabase(): Firestore {
  if (!db) {
    throw new Error('Dịch vụ Firestore chưa sẵn sàng.');
  }
  return db;
}

function parseStoredJson(key: string, message: string): unknown {
  const value = localStorage.getItem(key);
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch (error: unknown) {
    throw new Error(message, { cause: error });
  }
}

export async function getAttendanceLogs(userId: string): Promise<AttendanceRecord[]> {
  if (isDemoMode) {
    await delay(500);
    const key = `worklog_attendance_${userId}`;
    const stored = parseStoredJson(
      key,
      'Dữ liệu chấm công lưu trên thiết bị đã bị hỏng. Vui lòng xóa dữ liệu Demo và thử lại.',
    );
    if (stored !== null) return parseAttendanceRecords(stored);

    const generated = parseAttendanceRecords(generateMockAttendance(userId));
    localStorage.setItem(key, JSON.stringify(generated));
    return generated;
  }

  const firestore = requireDatabase();
  const attendanceQuery = query(
    collection(firestore, 'attendance'),
    where('userId', '==', userId),
  );
  const snapshot = await withTimeout(
    getDocs(attendanceQuery),
    6_000,
    'Không thể tải lịch sử chấm công (hết thời gian chờ).',
  );
  const records = snapshot.docs.map((item) =>
    parseAttendanceRecord({ id: item.id, ...item.data() }),
  );
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const now = new Date();
  const validated = validateAttendanceRecord(record, formatDateISO(now));
  const normalized = parseAttendanceRecord({
    ...validated,
    updatedAt: now.toISOString(),
  });

  if (isDemoMode) {
    await delay();
    const key = `worklog_attendance_${normalized.userId}`;
    const stored = parseStoredJson(
      key,
      'Dữ liệu chấm công lưu trên thiết bị đã bị hỏng. Vui lòng xóa dữ liệu Demo và thử lại.',
    );
    const records = stored === null ? [] : parseAttendanceRecords(stored);
    const index = records.findIndex((item) => item.date === normalized.date);
    if (index >= 0) records[index] = normalized;
    else records.push(normalized);
    records.sort((a, b) => a.date.localeCompare(b.date));
    localStorage.setItem(key, JSON.stringify(records));
    return;
  }

  const firestore = requireDatabase();
  const documentId = `${normalized.userId}_${normalized.date}`;
  await withTimeout(
    setDoc(doc(firestore, 'attendance', documentId), normalized, { merge: true }),
    6_000,
    'Không thể lưu thông tin chấm công (hết thời gian chờ).',
  );
}

export async function deleteAttendanceRecord(userId: string, date: string): Promise<void> {
  if (isDemoMode) {
    await delay();
    const key = `worklog_attendance_${userId}`;
    const stored = parseStoredJson(
      key,
      'Dữ liệu chấm công lưu trên thiết bị đã bị hỏng. Vui lòng xóa dữ liệu Demo và thử lại.',
    );
    if (stored === null) return;
    const records = parseAttendanceRecords(stored).filter((item) => item.date !== date);
    localStorage.setItem(key, JSON.stringify(records));
    return;
  }

  const firestore = requireDatabase();
  await withTimeout(
    deleteDoc(doc(firestore, 'attendance', `${userId}_${date}`)),
    6_000,
    'Không thể xóa bản ghi chấm công (hết thời gian chờ).',
  );
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  if (isDemoMode) {
    await delay(200);
    const key = `worklog_settings_${userId}`;
    const stored = parseStoredJson(
      key,
      'Cấu hình lưu trên thiết bị đã bị hỏng. Vui lòng xóa dữ liệu Demo và thử lại.',
    );
    if (stored !== null) return parseUserSettings(stored);

    const defaults = parseUserSettings({
      ...DEFAULT_SETTINGS,
      userId,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  const firestore = requireDatabase();
  const reference = doc(firestore, 'settings', userId);
  const snapshot = await withTimeout(
    getDoc(reference),
    6_000,
    'Không thể tải cài đặt (hết thời gian chờ).',
  );
  if (snapshot.exists()) return parseUserSettings(snapshot.data());

  const defaults = parseUserSettings({
    ...DEFAULT_SETTINGS,
    userId,
    updatedAt: new Date().toISOString(),
  });
  await withTimeout(
    setDoc(reference, defaults),
    6_000,
    'Không thể khởi tạo cài đặt (hết thời gian chờ).',
  );
  return defaults;
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const validated = parseUserSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });

  if (isDemoMode) {
    await delay(200);
    localStorage.setItem(
      `worklog_settings_${validated.userId}`,
      JSON.stringify(validated),
    );
    localStorage.setItem('worklog_theme', validated.theme);
    return;
  }

  const firestore = requireDatabase();
  await withTimeout(
    setDoc(doc(firestore, 'settings', validated.userId), validated, { merge: true }),
    6_000,
    'Không thể lưu cài đặt (hết thời gian chờ).',
  );
  localStorage.setItem('worklog_theme', validated.theme);
}
