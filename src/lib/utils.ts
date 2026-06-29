import { parse, format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Format currency to Vietnamese Dong (VNĐ)
 * Example: 8800000 -> "8.800.000 VNĐ"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  })
    .format(amount)
    .replace('₫', 'VNĐ');
}

/**
 * Calculates decimal hours between check-in and check-out
 * Example: "08:00" and "17:00" -> 9
 * Example: "08:30" and "17:45" -> 9.25
 */
export function calculateTotalHours(checkIn: string, checkOut: string): number {
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(checkIn) || !timePattern.test(checkOut)) {
    throw new Error('Thời gian không hợp lệ');
  }

  const [inHours, inMins] = checkIn.split(':').map(Number);
  const [outHours, outMins] = checkOut.split(':').map(Number);
  
  const startMinutes = inHours * 60 + inMins;
  const endMinutes = outHours * 60 + outMins;
  
  if (endMinutes === startMinutes) {
    throw new Error('Thời lượng ca làm phải lớn hơn 0');
  }

  if (endMinutes < startMinutes) {
    // If check-out is past midnight
    return ((24 * 60 - startMinutes) + endMinutes) / 60;
  }
  
  const diff = endMinutes - startMinutes;
  return Math.round((diff / 60) * 100) / 100;
}

/**
 * Format date string YYYY-MM-DD to Vietnamese format
 * Example: "2026-06-18" -> "Thứ Năm, 18/06/2026"
 */
export function formatDateVietnamese(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    const dayOfWeek = format(date, 'EEEE', { locale: vi });
    const formattedDate = format(date, 'dd/MM/yyyy');
    
    // Capitalize day of week
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    
    return `${capitalizedDay}, ${formattedDate}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get name of day of week
 * Example: "2026-06-18" -> "Thứ Năm"
 */
export function getDayOfWeekName(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    const dayOfWeek = format(date, 'EEEE', { locale: vi });
    return dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
  } catch {
    return '';
  }
}

/**
 * Generate dates for a calendar month (current, previous padding, next padding)
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  
  // Get the first day of the month and its day of the week
  // Sunday is 0, Monday is 1, etc. in JS, but let's align it.
  // We want Monday as the first day of the week (standard in VN/Europe)
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay(); // 0-6
  
  // Convert Sunday=0 to 7, so Monday=1, ..., Sunday=7
  if (startDay === 0) startDay = 7;
  
  // How many padding days from previous month?
  // If first day is Monday (1), we need 0 padding days.
  // If first day is Tuesday (2), we need 1 padding day, etc.
  const paddingDays = startDay - 1;
  const prevMonth = new Date(year, month, 0);
  const prevMonthDaysCount = prevMonth.getDate();
  
  for (let i = paddingDays - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthDaysCount - i));
  }
  
  // Current month days
  const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= currentMonthDaysCount; i++) {
    days.push(new Date(year, month, i));
  }
  
  // Padding days from next month to complete the grid of 42 (6 weeks) or multiple of 7
  const totalGrid = 42;
  const remaining = totalGrid - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

/**
 * Check if two date objects are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
