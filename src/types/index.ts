export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: string;
}

export type AttendanceStatus = 'work' | 'leave' | 'off' | 'empty';

export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm
  checkOut?: string; // HH:mm
  totalHours?: number;
  note?: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
}

export type SalaryType = 'daily' | 'hourly';

export interface UserSettings {
  userId: string;
  salaryType: SalaryType;
  salaryAmount: number;
  workHoursPerDay: number; // default: 8
  theme: 'light' | 'dark';
  updatedAt: string;
}
