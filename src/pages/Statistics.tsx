import React, { useState } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useSettingsData } from '../hooks/useSettingsData';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/Card';
import { ChartSkeleton } from '../components/Skeletons';
import { ErrorState } from '../components/ErrorState';
import { calculateAttendanceSummary } from '../lib/attendanceRules';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Activity,
  AlertCircle
} from 'lucide-react';

export const Statistics: React.FC = () => {
  const { theme } = useTheme();
  const {
    records,
    loading: attendanceLoading,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useAttendanceData();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettingsData();

  // Selected Month State (format: YYYY-MM, defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Extract unique months list
  const getAvailableMonths = () => {
    const months = new Set<string>();
    records.forEach(r => {
      if (r.date) {
        months.add(r.date.substring(0, 7));
      }
    });
    // Add current month in case it's not in records yet
    const today = new Date();
    const currentM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    months.add(currentM);
    
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const availableMonths = getAvailableMonths();

  if (attendanceError || settingsError) {
    return (
      <ErrorState
        message={attendanceError ?? settingsError ?? 'Không thể tải dữ liệu.'}
        onRetry={() => {
          void refetchAttendance();
          void refetchSettings();
        }}
      />
    );
  }

  if (attendanceLoading || settingsLoading || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 bg-slate-100 dark:bg-slate-900/40 rounded-xl w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Filter records by selected month
  const thisMonthRecords = records.filter(r => r.date.startsWith(selectedMonth));

  // 1. KPI Calculations
  const summary = calculateAttendanceSummary(thisMonthRecords, settings);
  const totalDays = summary.workDays;
  const leaveDays = summary.leaveDays;
  const offDays = summary.offDays;
  const totalHours = summary.totalHours;
  const averageHoursPerDay = summary.averageHoursPerDay;
  const estimatedSalary = summary.estimatedSalary;

  // Chart Theme Colors dynamic mapping
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const tooltipBg = theme === 'dark' ? '#151b2c' : '#ffffff';
  const tooltipText = theme === 'dark' ? '#f3f4f6' : '#111827';

  // 2. Bar Chart Data: Daily Work Hours
  // We want to render daily hours for all dates worked in the month
  const barChartData = thisMonthRecords
    .filter(r => r.status === 'work')
    .map(r => {
      const dayNum = parseInt(r.date.split('-')[2]);
      return {
        name: `Ngày ${dayNum}`,
        hours: r.totalHours || 0,
      };
    })
    .sort((a, b) => {
      const dayA = parseInt(a.name.replace('Ngày ', ''));
      const dayB = parseInt(b.name.replace('Ngày ', ''));
      return dayA - dayB;
    });

  // 3. Line Chart Data: Weekly Trends (divided into 5 calendar weeks)
  const getWeeklyData = () => {
    let week1 = 0, week2 = 0, week3 = 0, week4 = 0, week5 = 0;
    
    thisMonthRecords.forEach(r => {
      if (r.status === 'work' && r.totalHours) {
        const day = parseInt(r.date.split('-')[2]);
        if (day <= 7) week1 += r.totalHours;
        else if (day <= 14) week2 += r.totalHours;
        else if (day <= 21) week3 += r.totalHours;
        else if (day <= 28) week4 += r.totalHours;
        else week5 += r.totalHours;
      }
    });

    return [
      { name: 'Tuần 1 (1-7)', hours: Math.round(week1 * 10) / 10 },
      { name: 'Tuần 2 (8-14)', hours: Math.round(week2 * 10) / 10 },
      { name: 'Tuần 3 (15-21)', hours: Math.round(week3 * 10) / 10 },
      { name: 'Tuần 4 (22-28)', hours: Math.round(week4 * 10) / 10 },
      { name: 'Tuần 5 (29+)', hours: Math.round(week5 * 10) / 10 },
    ];
  };

  const lineChartData = getWeeklyData();

  // 4. Donut Chart Data: Distribution
  const pieChartData = [
    { name: '🟢 Đi làm', value: totalDays, color: '#22C55E' },
    { name: '🟡 Nghỉ phép', value: leaveDays, color: '#F59E0B' },
    { name: '🔴 Nghỉ', value: offDays, color: '#EF4444' },
  ].filter(item => item.value > 0); // Only render slices with values > 0

  const hasData = thisMonthRecords.length > 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      
      {/* Page Header & Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <Activity size={24} className="text-primary" />
            Thống kê & Báo cáo
          </h1>
          <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1">
            Theo dõi xu hướng giờ làm và ước lượng chi tiết tiền lương
          </p>
        </div>

        {/* Dropdown filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 rounded-2xl px-4 py-2.5 shadow-soft w-full sm:w-auto">
          <Calendar size={16} className="text-primary" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent border-none text-gray-800 dark:text-gray-200 font-bold text-sm focus:outline-none cursor-pointer w-full"
          >
            {availableMonths.map(m => {
              const [y, mm] = m.split('-');
              return (
                <option key={m} value={m}>Tháng {mm}/{y}</option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng ngày công */}
        <div className="p-5 rounded-3xl bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brandText-secondaryLight dark:text-brandText-secondaryDark">Tổng ngày công</span>
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{totalDays} ngày</h3>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Nghỉ phép: {leaveDays} · Không lương: {offDays}</div>
        </div>

        {/* Card 2: Tổng giờ làm */}
        <div className="p-5 rounded-3xl bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brandText-secondaryLight dark:text-brandText-secondaryDark">Tổng giờ làm</span>
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{totalHours.toFixed(1)} giờ</h3>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Hao phí công sức trong tháng</div>
        </div>

        {/* Card 3: Trung bình giờ */}
        <div className="p-5 rounded-3xl bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brandText-secondaryLight dark:text-brandText-secondaryDark">Trung bình giờ/ngày</span>
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">{averageHoursPerDay.toFixed(2)}h</h3>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">Mục tiêu ngày làm việc: {settings.workHoursPerDay}h</div>
        </div>

        {/* Card 4: Tổng lương dự kiến */}
        <div className="p-5 rounded-3xl bg-white dark:bg-brandCard-dark border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <span className="text-[10px] uppercase font-bold tracking-wider text-brandText-secondaryLight dark:text-brandText-secondaryDark">Lương dự kiến</span>
          <h3 className="text-xl md:text-2xl font-extrabold text-primary mt-1 truncate">{formatCurrency(estimatedSalary)}</h3>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1">
            Tính theo: {settings.salaryType === 'daily' ? `ngày (${formatCurrency(settings.salaryAmount)})` : `giờ (${formatCurrency(settings.salaryAmount)})`}
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Bar Chart: Daily Work hours (col-span-2) */}
          <Card className="lg:col-span-2 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 mb-6 flex items-center gap-1.5">
              <Clock size={16} className="text-primary" />
              Biểu đồ số giờ làm việc theo ngày
            </h3>
            <div className="h-72 w-full text-xs">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                        background: tooltipBg,
                        color: tooltipText
                      }} 
                    />
                    <Bar dataKey="hours" name="Số giờ làm" fill="#7C5CFC" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 font-semibold">
                  Không có dữ liệu làm việc (Đi làm) để vẽ biểu đồ
                </div>
              )}
            </div>
          </Card>

          {/* Donut Chart: Distribution Ratio (col-span-1) */}
          <Card className="lg:col-span-1 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 mb-6 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-primary" />
              Tỷ lệ phân phối ngày công
            </h3>
            <div className="h-60 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                      background: tooltipBg,
                      color: tooltipText
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Inner Center Text */}
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                  {totalDays + leaveDays + offDays}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                  Tổng bản ghi
                </span>
              </div>
            </div>

            {/* Custom legends for visual details */}
            <div className="flex flex-col gap-2 mt-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Đi làm</span>
                <span>{totalDays} ngày ({totalDays + leaveDays + offDays > 0 ? Math.round((totalDays / (totalDays + leaveDays + offDays)) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning" /> Nghỉ phép</span>
                <span>{leaveDays} ngày ({totalDays + leaveDays + offDays > 0 ? Math.round((leaveDays / (totalDays + leaveDays + offDays)) * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> Nghỉ không lương</span>
                <span>{offDays} ngày ({totalDays + leaveDays + offDays > 0 ? Math.round((offDays / (totalDays + leaveDays + offDays)) * 100) : 0}%)</span>
              </div>
            </div>
          </Card>

          {/* Line Chart: Weekly hours trend (col-span-3) */}
          <Card className="lg:col-span-3 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 mb-6 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-primary" />
              Biểu đồ số giờ làm việc theo tuần
            </h3>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                      background: tooltipBg,
                      color: tooltipText
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    name="Giờ làm việc"
                    stroke="#7C5CFC" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <AlertCircle size={48} className="text-gray-300 dark:text-gray-700 animate-bounce" />
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Không tìm thấy dữ liệu trong tháng {selectedMonth}</h3>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1 max-w-xs leading-relaxed font-medium">
              Vui lòng chọn tháng khác có dữ liệu chấm công hoặc bổ sung giờ làm việc thủ công.
            </p>
          </div>
        </Card>
      )}

    </div>
  );
};
