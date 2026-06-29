import React, { useState, useEffect } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useSettingsData } from '../hooks/useSettingsData';
import { useAuth } from '../contexts/auth-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { StatsSkeleton } from '../components/Skeletons';
import { 
  formatCurrency, 
  formatDateVietnamese, 
  getDaysInMonth, 
  isSameDay, 
  formatDateISO
} from '../lib/utils';
import { 
  CalendarDays, 
  Clock, 
  Coins, 
  Flame, 
  Play, 
  Square, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    records, 
    todayRecord, 
    loading: attendanceLoading, 
    actionLoading, 
    checkIn, 
    checkOut, 
    saveRecord, 
    deleteRecord 
  } = useAttendanceData();
  const { settings, loading: settingsLoading } = useSettingsData();


  // Clock State
  const [time, setTime] = useState<Date>(new Date());
  
  // Calendar month/year navigation state
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  
  // Modal states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form states for manual editing/adding
  const [editCheckIn, setEditCheckIn] = useState('08:00');
  const [editCheckOut, setEditCheckOut] = useState('17:00');
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('work');
  const [editNote, setEditNote] = useState('');

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync edit form with selected record when selected date or records list changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDateISO(selectedDate);
      const record = records.find(r => r.date === dateStr);
      if (record) {
        setEditCheckIn(record.checkIn || '08:00');
        setEditCheckOut(record.checkOut || '17:00');
        setEditStatus(record.status);
        setEditNote(record.note || '');
      } else {
        setEditCheckIn('08:00');
        setEditCheckOut('17:00');
        setEditStatus('work');
        setEditNote('');
      }
    }
  }, [selectedDate, records]);

  if (attendanceLoading || settingsLoading || !settings || !user) {
    return (
      <div className="flex flex-col gap-6">
        {/* Skeleton Header */}
        <div className="h-14 bg-slate-100 dark:bg-slate-900/40 rounded-2xl w-1/3 animate-pulse" />
        <StatsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-80 bg-slate-100 dark:bg-slate-900/40 rounded-3xl animate-pulse" />
          <div className="lg:col-span-2 h-80 bg-slate-100 dark:bg-slate-900/40 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Current month bounds for filter
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); // 0-11
  const daysGrid = getDaysInMonth(year, month);

  const startOfMonthStr = formatDateISO(new Date(year, month, 1));
  const endOfMonthStr = formatDateISO(new Date(year, month + 1, 0));

  // Filter records belonging to the selected calendar month
  const thisMonthRecords = records.filter(r => r.date >= startOfMonthStr && r.date <= endOfMonthStr);

  // Stats Calculations
  const daysWorked = thisMonthRecords.filter(r => r.status === 'work').length;
  const completedDaysWorked = thisMonthRecords.filter(r => r.status === 'work' && r.checkIn && r.checkOut).length;
  const totalHours = thisMonthRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  
  // Salary Calculations
  let estimatedSalary = 0;
  if (settings.salaryType === 'daily') {
    estimatedSalary = completedDaysWorked * settings.salaryAmount;
  } else {
    estimatedSalary = totalHours * settings.salaryAmount;
  }

  // Streak Calculation
  const calculateStreak = (allRecords: AttendanceRecord[]): number => {
    const workDates = allRecords
      .filter(r => r.status === 'work')
      .map(r => r.date);
    
    if (workDates.length === 0) return 0;
    
    const workDatesSet = new Set(workDates);
    const todayStr = formatDateISO(new Date());
    
    let checkDate: Date | null = null;
    
    if (workDatesSet.has(todayStr)) {
      // User worked today
      checkDate = new Date();
    } else {
      // User hasn't worked today. Check if the streak is alive from the last required workday.
      let scan = new Date();
      scan.setDate(scan.getDate() - 1); // Start from yesterday
      
      // Safety limit for backward weekend scan (up to 5 days)
      let limit = 5;
      while (limit > 0) {
        limit--;
        const dayVal = scan.getDay();
        const isWeekend = dayVal === 0 || dayVal === 6;
        if (!isWeekend) {
          // This is the last required workday
          const scanStr = formatDateISO(scan);
          if (workDatesSet.has(scanStr)) {
            checkDate = scan;
          }
          break; // Stop after checking the last required workday
        }
        scan.setDate(scan.getDate() - 1);
      }
    }
    
    if (!checkDate) return 0;
    
    // Now count consecutive worked days backwards from checkDate
    let count = 0;
    let scanDate = new Date(checkDate);
    
    // Limit to prevent infinite loop
    let maxIterations = 365;
    while (maxIterations > 0) {
      maxIterations--;
      const scanStr = formatDateISO(scanDate);
      const dayVal = scanDate.getDay();
      const isWeekend = dayVal === 0 || dayVal === 6;
      
      if (workDatesSet.has(scanStr)) {
        count++;
      } else if (isWeekend) {
        // Skip weekends without breaking
      } else {
        // Weekday not worked - streak is broken!
        break;
      }
      scanDate.setDate(scanDate.getDate() - 1);
    }
    
    return count;
  };

  const streak = calculateStreak(records);

  // Helper to parse date string YYYY-MM-DD safely into local Date object
  const parseISODate = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Find any past uncompleted work logs (status === 'work', has checkIn, but no checkOut, and date is before today)
  const todayStr = formatDateISO(new Date());
  const uncompletedShifts = records.filter(
    r => r.status === 'work' && r.checkIn && !r.checkOut && r.date < todayStr
  );

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  // Calendar render config
  const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Detail Modal functions
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsEditMode(false);
    setIsDetailModalOpen(true);
  };

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    const dateStr = formatDateISO(selectedDate);
    try {
      await saveRecord(dateStr, editCheckIn, editCheckOut, editStatus, editNote);
      setIsDetailModalOpen(false);
      setIsEditMode(false);
    } catch (err) {
      // Toast notification is handled in custom hook
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedDate) return;
    const dateStr = formatDateISO(selectedDate);
    await deleteRecord(dateStr);
    setIsDeleteConfirmOpen(false);
    setIsDetailModalOpen(false);
  };

  const selectedDateStr = selectedDate ? formatDateISO(selectedDate) : '';
  const selectedRecord = records.find(r => r.date === selectedDateStr);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* 1. Header Greeting Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Xin chào {user.displayName.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark font-medium mt-1">
            {formatDateVietnamese(formatDateISO(new Date()))}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-brandCard-dark px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <img 
            src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`} 
            alt="Avatar" 
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{user.displayName}</span>
        </div>
      </div>

      {/* 1.5 Warning banner for uncompleted past shifts */}
      {uncompletedShifts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-5 rounded-3xl flex items-start gap-3.5 shadow-sm animate-fadeIn">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">
              Bạn có ca làm chưa hoàn thành!
            </h4>
            <p className="mt-1 font-medium leading-relaxed opacity-95">
              Hệ thống phát hiện {uncompletedShifts.length} ngày làm việc bạn chưa ghi nhận giờ ra (Check-Out):
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {uncompletedShifts.slice(0, 4).map((r) => (
                <button
                  key={r.date}
                  onClick={() => handleDayClick(parseISODate(r.date))}
                  className="px-3.5 py-1.5 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-colors shadow-soft"
                >
                  {r.date.split('-').reverse().join('/')} ({r.checkIn})
                </button>
              ))}
              {uncompletedShifts.length > 4 && (
                <span className="self-center font-bold text-amber-700 dark:text-amber-500">
                  và {uncompletedShifts.length - 4} ngày khác...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Stats Grid (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Ngày công */}
        <Card hoverEffect className="flex items-center space-x-4 p-5 md:p-6">
          <div className="p-3 bg-primary-soft text-primary rounded-2xl">
            <CalendarDays size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">
              Ngày công tháng này
            </p>
            <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
              {daysWorked} ngày
            </h3>
          </div>
        </Card>

        {/* Card 2: Tổng giờ làm */}
        <Card hoverEffect className="flex items-center space-x-4 p-5 md:p-6">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">
              Tổng giờ làm việc
            </p>
            <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
              {totalHours.toFixed(1)} giờ
            </h3>
          </div>
        </Card>

        {/* Card 3: Lương tạm tính */}
        <Card hoverEffect className="flex items-center space-x-4 p-5 md:p-6">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">
              Lương tạm tính
            </p>
            <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate max-w-[170px]">
              {formatCurrency(estimatedSalary)}
            </h3>
          </div>
        </Card>

        {/* Card 4: Chuỗi ngày */}
        <Card hoverEffect className="flex items-center space-x-4 p-5 md:p-6">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">
              Chuỗi ngày liên tiếp
            </p>
            <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">
              {streak} ngày
            </h3>
          </div>
        </Card>
      </div>

      {/* 3. Main Workspace Row (Clocking Card & Monthly Calendar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Attendance Check-in Clock */}
        <Card className="lg:col-span-1 flex flex-col items-center text-center p-8 gap-6 justify-center">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Chấm công hôm nay
            </h2>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1">
              Ghi nhận giờ làm việc tức thời
            </p>
          </div>

          {/* Real-time Clock Widget */}
          <div className="flex flex-col items-center">
            <div className="text-4xl font-extrabold tracking-tight font-mono text-primary bg-primary-soft/40 px-6 py-4 rounded-3xl dark:bg-primary-soft/10">
              {time.toLocaleTimeString('vi-VN')}
            </div>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-2.5 font-medium">
              Múi giờ: GMT+7 (Bangkok/Hanoi)
            </p>
          </div>

          {/* Business Rules Interactive Buttons */}
          <div className="w-full flex flex-col gap-3">
            {!todayRecord ? (
              // Case 1: Unchecked in
              <Button
                variant="success"
                className="w-full py-4 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-green-500/20"
                isLoading={actionLoading}
                onClick={() => checkIn()}
              >
                <Play size={16} className="fill-white mr-2" />
                Vào ca (Check In)
              </Button>
            ) : !todayRecord.checkOut ? (
              // Case 2: Checked in, waiting for checkout
              <div className="flex flex-col gap-3 w-full animate-fadeIn">
                <div className="bg-green-500-soft text-green-600 dark:bg-green-950/20 dark:text-green-400 p-3 rounded-2xl text-xs font-semibold border border-green-500/10">
                  ▶ Đã Check In lúc: <span className="font-bold">{todayRecord.checkIn}</span>
                </div>
                <Button
                  variant="danger"
                  className="w-full py-4 text-sm font-semibold rounded-2xl shadow-lg hover:shadow-red-500/20"
                  isLoading={actionLoading}
                  onClick={() => checkOut()}
                >
                  <Square size={16} className="fill-white mr-2" />
                  Ra ca (Check Out)
                </Button>
              </div>
            ) : (
              // Case 3: Completed both check-in & out
              <div className="flex flex-col items-center justify-center p-5 bg-green-50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 rounded-3xl w-full gap-2.5 animate-fadeIn">
                <CheckCircle2 size={36} className="text-green-500" />
                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                  Hoàn thành hôm nay
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {todayRecord.checkIn} → {todayRecord.checkOut} · Tổng: <span className="font-bold text-primary">{todayRecord.totalHours} giờ</span>
                </div>
                {todayRecord.note && (
                  <div className="text-[11px] italic text-gray-500 dark:text-gray-500 max-w-xs truncate">
                    "{todayRecord.note}"
                  </div>
                )}
              </div>
            )}
            
            {/* Always allow manual edit link */}
            <button
              onClick={() => handleDayClick(new Date())}
              className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors mt-2"
            >
              Quên chấm công? Chỉnh sửa thủ công
            </button>
          </div>
        </Card>

        {/* Right Column: Monthly Calendar View */}
        <Card className="lg:col-span-2 p-6 flex flex-col">
          {/* Calendar Header with Navigation */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-gray-950 dark:text-gray-50 flex items-center gap-2">
              <CalendarDays size={18} className="text-primary" />
              Lịch chấm công tháng {String(month + 1).padStart(2, '0')}/{year}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-gray-100 dark:border-gray-900/30 rounded-xl text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="px-3 py-1.5 border border-gray-100 dark:border-gray-900/30 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
              >
                Hiện tại
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 border border-gray-100 dark:border-gray-900/30 rounded-xl text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center font-bold text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark pb-3 border-b border-gray-50 dark:border-gray-900/25 mb-3">
            {weekdays.map((day, i) => (
              <div key={i}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((date, index) => {
              const dateStr = formatDateISO(date);
              const record = records.find(r => r.date === dateStr);
              const isCurrentMonth = date.getMonth() === month;
              const isToday = isSameDay(date, new Date());
              
              // Status Styling details
              let statusDot = null;
              let dayStyles = 'text-gray-800 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-900/60';
              
              if (!isCurrentMonth) {
                dayStyles = 'text-gray-300 dark:text-gray-700 hover:bg-slate-50 dark:hover:bg-slate-900/20';
              }

              if (record) {
                switch (record.status) {
                  case 'work':
                    statusDot = <span className="w-1.5 h-1.5 rounded-full bg-success inline-block mt-1 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />;
                    if (isCurrentMonth) dayStyles += ' bg-green-500/5 dark:bg-green-950/10 border-green-500/20';
                    break;
                  case 'leave':
                    statusDot = <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block mt-1 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />;
                    if (isCurrentMonth) dayStyles += ' bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/20';
                    break;
                  case 'off':
                    statusDot = <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block mt-1 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />;
                    if (isCurrentMonth) dayStyles += ' bg-red-500/5 dark:bg-red-950/10 border-red-500/20';
                    break;
                  default:
                    statusDot = <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 inline-block mt-1" />;
                }
              } else {
                statusDot = <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 inline-block mt-1" />;
              }

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`relative p-2.5 flex flex-col justify-center items-center aspect-square rounded-2xl border border-transparent font-semibold transition-all select-none ${dayStyles} ${
                    isToday ? 'ring-2 ring-primary bg-primary-soft/20 border-primary/20 dark:bg-primary-soft/10 text-primary font-bold' : ''
                  }`}
                >
                  <span className="text-xs">{date.getDate()}</span>
                  {statusDot}
                </button>
              );
            })}
          </div>

          {/* Status Legends */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark justify-center border-t border-gray-50 dark:border-gray-900/30 pt-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" /> Đi làm
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> Nghỉ phép
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Nghỉ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-800" /> Chưa chấm công
            </span>
          </div>
        </Card>
      </div>

      {/* 4. Day Details Dialog / Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setIsEditMode(false);
        }}
        title={selectedDate ? formatDateVietnamese(formatDateISO(selectedDate)) : ''}
      >
        {selectedDate && (
          <div className="flex flex-col gap-6">
            {!isEditMode ? (
              // View Mode
              <div className="flex flex-col gap-5">
                {selectedRecord ? (
                  // Record exists
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-gray-100 dark:border-gray-900/30 flex flex-col gap-1 text-center">
                        <span className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">Check In</span>
                        <span className="text-base font-bold text-gray-800 dark:text-gray-200">{selectedRecord.checkIn || '--:--'}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-gray-100 dark:border-gray-900/30 flex flex-col gap-1 text-center">
                        <span className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">Check Out</span>
                        <span className="text-base font-bold text-gray-800 dark:text-gray-200">{selectedRecord.checkOut || '--:--'}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-gray-100 dark:border-gray-900/30 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">Trạng thái</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          selectedRecord.status === 'work' 
                            ? 'bg-success/15 text-success' 
                            : selectedRecord.status === 'leave'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-danger/15 text-danger'
                        }`}>
                          {selectedRecord.status === 'work' 
                            ? '🟢 Đi làm' 
                            : selectedRecord.status === 'leave' 
                            ? '🟡 Nghỉ phép' 
                            : '🔴 Nghỉ'}
                        </span>
                      </div>
                      
                      {selectedRecord.status === 'work' && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">Tổng giờ làm</span>
                          <span className="font-extrabold text-primary">{selectedRecord.totalHours ? `${selectedRecord.totalHours} giờ` : 'Chưa Check Out'}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5 text-sm">
                        <span className="font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark">Ghi chú công việc</span>
                        <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-brandCard-dark/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-900/10 text-xs min-h-[50px] font-medium leading-relaxed">
                          {selectedRecord.note || 'Không có ghi chú.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3.5 mt-2 border-t border-gray-50 dark:border-gray-900/20 pt-4">
                      <Button
                        variant="danger"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="flex items-center gap-1.5 px-4"
                      >
                        <Trash2 size={16} /> Xóa
                      </Button>
                      {selectedDate && selectedDate <= new Date() && (
                        <Button
                          variant="primary"
                          onClick={() => setIsEditMode(true)}
                          className="flex items-center gap-1.5 px-4"
                        >
                          <Edit3 size={16} /> Chỉnh sửa
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Empty state for clicked date
                  <div className="flex flex-col items-center justify-center py-6 text-center gap-4 animate-fadeIn">
                    <AlertCircle size={44} className="text-gray-300 dark:text-gray-600" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-250">Chưa có dữ liệu chấm công</h4>
                      <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1 max-w-[280px]">
                        Hãy thêm bản ghi chấm công thủ công cho ngày này.
                      </p>
                    </div>
                    {selectedDate && selectedDate <= new Date() && (
                      <Button
                        variant="primary"
                        onClick={() => setIsEditMode(true)}
                        className="px-6 py-2.5 mt-2 text-xs font-semibold"
                      >
                        ✨ Thêm nhanh chấm công
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Edit / Add Mode Form
              <form onSubmit={handleSaveManualRecord} className="flex flex-col gap-5 animate-fadeIn">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                    Trạng thái ngày công
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'work', label: 'Đi làm', color: 'border-success/30 hover:border-success text-green-600 bg-green-500/5' },
                      { key: 'leave', label: 'Nghỉ phép', color: 'border-warning/30 hover:border-warning text-amber-600 bg-amber-500/5' },
                      { key: 'off', label: 'Nghỉ', color: 'border-danger/30 hover:border-danger text-red-600 bg-red-500/5' }
                    ].map((st) => (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setEditStatus(st.key as AttendanceStatus)}
                        className={`py-3 px-2 border rounded-2xl text-xs font-semibold text-center transition-all ${
                          editStatus === st.key 
                            ? 'ring-2 ring-primary border-primary bg-primary-soft/10 text-primary font-bold'
                            : 'bg-slate-50 dark:bg-slate-900/10 border-gray-150 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {editStatus === 'work' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Giờ bắt đầu (Check In)"
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      required
                    />
                    <Input
                      label="Giờ kết thúc (Check Out)"
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-bold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Đi làm muộn, tăng ca, WFH, v.v..."
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 text-gray-900 placeholder-gray-400 font-medium rounded-2xl py-3 px-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-slate-900/40 dark:border-slate-800/80 dark:hover:border-slate-700/80 dark:focus:border-primary/50 dark:text-gray-100 dark:placeholder-gray-500 text-xs min-h-[90px] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3.5 border-t border-gray-50 dark:border-gray-900/20 pt-4 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (selectedRecord) {
                        setIsEditMode(false);
                      } else {
                        setIsDetailModalOpen(false);
                        setIsEditMode(false);
                      }
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={actionLoading}
                  >
                    Lưu lại
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* 5. Delete Confirm Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Xác nhận xóa bản ghi"
      >
        <div className="flex flex-col gap-5 text-center items-center py-2">
          <AlertCircle size={56} className="text-danger animate-pulse" />
          <div>
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">Bạn có chắc chắn muốn xóa?</h4>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-2 max-w-[340px] leading-relaxed">
              Hành động này sẽ xóa vĩnh viễn lịch sử chấm công ngày <span className="font-bold text-gray-950 dark:text-gray-100">{selectedDate ? formatDateISO(selectedDate) : ''}</span>. Dữ liệu lương và giờ công sẽ thay đổi tương ứng.
            </p>
          </div>
          <div className="flex justify-center gap-3.5 w-full mt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-6"
            >
              Hủy
                </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRecord}
              className="px-6"
              isLoading={actionLoading}
            >
              Đồng ý Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
