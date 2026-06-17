import React, { useState } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { formatDateISO } from '../lib/utils';
import { Calendar, Clock, BadgeHelp, ClipboardCheck } from 'lucide-react';
import type { AttendanceStatus } from '../types';
import toast from 'react-hot-toast';

export const Attendance: React.FC = () => {
  const { records, saveRecord, actionLoading } = useAttendanceData();
  
  // Form States
  const [logDate, setLogDate] = useState(formatDateISO(new Date()));
  const [status, setStatus] = useState<AttendanceStatus>('work');
  const [checkIn, setCheckIn] = useState('08:00');
  const [checkOut, setCheckOut] = useState('17:00');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if a record already exists for this date
    const exists = records.find(r => r.date === logDate);
    if (exists) {
      toast.error(`Ngày ${logDate} đã có dữ liệu chấm công! Vui lòng sửa trực tiếp tại trang Lịch sử.`);
      return;
    }

    try {
      await saveRecord(logDate, checkIn, checkOut, status, note);
      // Reset form fields
      setNote('');
      toast.success(`Đã thêm ghi nhận chấm công ngày ${logDate}`);
    } catch (err) {
      // Error toast handled inside hook
    }
  };

  // Recent logs (last 3 days)
  const getRecentLogs = () => {
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(formatDateISO(d));
    }

    return dates.map(dateStr => {
      const record = records.find(r => r.date === dateStr);
      return {
        dateStr,
        record
      };
    });
  };

  const recentLogs = getRecentLogs();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Ghi nhận công
        </h1>
        <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1">
          Bổ sung giờ làm việc thủ công và xem các quy định ghi nhận công
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Retrospective Form Card */}
        <Card className="lg:col-span-2 p-6 md:p-8">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <ClipboardCheck size={20} className="text-primary" />
            Thêm bản ghi chấm công thủ công
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Date Input */}
              <Input
                label="Ngày chấm công"
                type="date"
                value={logDate}
                max={formatDateISO(new Date())}
                onChange={(e) => setLogDate(e.target.value)}
                required
                leftIcon={<Calendar size={18} />}
              />

              {/* Status Select */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                  Trạng thái ngày công
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-primary/50 text-gray-900 font-medium rounded-2xl py-3 px-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-slate-900/40 dark:border-slate-800/85 dark:focus:border-primary/50 dark:text-gray-100 text-sm h-[46px]"
                >
                  <option value="work">🟢 Đi làm</option>
                  <option value="leave">🟡 Nghỉ phép</option>
                  <option value="off">🔴 Nghỉ không lương</option>
                </select>
              </div>
            </div>

            {/* In / Out Times */}
            {status === 'work' && (
              <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                <Input
                  label="Giờ bắt đầu"
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                  leftIcon={<Clock size={16} />}
                />
                <Input
                  label="Giờ kết thúc"
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                  leftIcon={<Clock size={16} />}
                />
              </div>
            )}

            {/* Note Input */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                Ghi chú nội dung công việc
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Họp khách hàng, tăng ca dự án, làm tại nhà (WFH)..."
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 text-gray-900 placeholder-gray-400 font-medium rounded-2xl py-3 px-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-slate-900/40 dark:border-slate-800/80 dark:focus:border-primary/50 dark:text-gray-100 dark:placeholder-gray-500 text-sm min-h-[100px] resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end mt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={actionLoading}
                className="px-8 py-3"
              >
                Ghi nhận bản ghi công
              </Button>
            </div>

          </form>
        </Card>

        {/* Right Info Cards */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Rules & Warnings */}
          <Card className="p-6 bg-slate-50 border-slate-150/40 dark:bg-brandCard-dark dark:border-gray-900/40">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 mb-3 flex items-center gap-1.5">
              <BadgeHelp size={16} className="text-primary" />
              Quy định nghiệp vụ
            </h3>
            <ul className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark space-y-3.5 font-medium leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-gray-900 dark:text-gray-200">Một bản ghi mỗi ngày:</strong> Mỗi ngày chỉ có duy nhất một trạng thái chấm công.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-gray-200">Tính toán giờ công:</strong> Hệ thống tự động tính số giờ làm từ hiệu số Check Out trừ Check In.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-gray-200">Lương tạm tính:</strong> Tự động cập nhật dựa trên loại lương ngày/giờ mà bạn cấu hình ở mục Cài đặt.
              </li>
              <li>
                <strong className="text-gray-900 dark:text-gray-200">Chỉnh sửa/Xóa:</strong> Cho phép chỉnh sửa thủ công bất kỳ lúc nào nếu xảy ra quên Check-in hay Check-out.
              </li>
            </ul>
          </Card>

          {/* Recent Records Summary */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50 mb-4">
              Ghi nhận gần đây
            </h3>
            <div className="flex flex-col gap-3">
              {recentLogs.map(({ dateStr, record }) => (
                <div 
                  key={dateStr}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/25 border border-slate-100/50 dark:border-slate-900/10 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {dateStr === formatDateISO(new Date()) ? 'Hôm nay' : dateStr === formatDateISO(new Date(Date.now() - 86400000)) ? 'Hôm qua' : 'Hôm kia'}
                    </span>
                    <span className="text-brandText-secondaryLight dark:text-brandText-secondaryDark">
                      {dateStr}
                    </span>
                  </div>
                  
                  {record ? (
                    <div className="text-right">
                      {record.status === 'work' ? (
                        <>
                          <div className="font-semibold text-success">🟢 Đi làm</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {record.checkIn} - {record.checkOut || '??:??'} ({record.totalHours ? `${record.totalHours}h` : 'chưa ra'})
                          </div>
                        </>
                      ) : record.status === 'leave' ? (
                        <div className="font-semibold text-warning">🟡 Nghỉ phép</div>
                      ) : (
                        <div className="font-semibold text-danger">🔴 Nghỉ</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic dark:text-gray-600 font-medium">
                      Chưa chấm công
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
