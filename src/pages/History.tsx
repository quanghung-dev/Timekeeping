import React, { useState } from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { TableSkeleton } from '../components/Skeletons';
import { ErrorState } from '../components/ErrorState';
import { getDayOfWeekName } from '../lib/utils';
import { matchesAttendanceSearch } from '../lib/attendanceFilters';
import { 
  Search, 
  ArrowUpDown, 
  Edit2, 
  Trash2, 
  Calendar, 
  AlertCircle
} from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const History: React.FC = () => {
  const { records, loading, actionLoading, error, saveRecord, deleteRecord, refetch } = useAttendanceData();
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all'); // format: "YYYY-MM"
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals States
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecordDate, setDeletingRecordDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit Form States
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('work');
  const [editCheckIn, setEditCheckIn] = useState('08:00');
  const [editCheckOut, setEditCheckOut] = useState('17:00');
  const [editNote, setEditNote] = useState('');

  // Extract unique months from records for the dropdown filter (format: YYYY-MM)
  const getAvailableMonths = () => {
    const months = new Set<string>();
    records.forEach(r => {
      if (r.date) {
        months.add(r.date.substring(0, 7)); // get YYYY-MM
      }
    });
    // Sort descending
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

  const availableMonths = getAvailableMonths();

  // Filter & Sort Logic
  const filteredRecords = records
    .filter(record => {
      // 1. Filter by Search term (Note check)
      const matchesSearch = matchesAttendanceSearch(record, searchTerm);
      
      // 2. Filter by Month
      const matchesMonth = selectedMonth === 'all' || record.date.startsWith(selectedMonth);

      return matchesSearch && matchesMonth;
    })
    .sort((a, b) => {
      // 3. Sort by Date
      const dateA = a.date;
      const dateB = b.date;
      return sortOrder === 'desc' 
        ? dateB.localeCompare(dateA) 
        : dateA.localeCompare(dateB);
    });

  const handleEditClick = (record: AttendanceRecord) => {
    setEditStatus(record.status);
    setEditCheckIn(record.checkIn || '08:00');
    setEditCheckOut(record.checkOut || '17:00');
    setEditNote(record.note || '');
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (date: string) => {
    setDeletingRecordDate(date);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      await saveRecord(editingRecord.date, editCheckIn, editCheckOut, editStatus, editNote);
      setIsEditModalOpen(false);
      setEditingRecord(null);
    } catch {
      // error handled in hook
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecordDate) return;
    try {
      await deleteRecord(deletingRecordDate);
      setIsDeleteModalOpen(false);
      setDeletingRecordDate(null);
    } catch {
      // The hook displays the error; keep the confirmation open for retry.
    }
  };

  // Convert Status to Badge styling
  const renderStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'work':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-success">
            🟢 Đi làm
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-warning">
            🟡 Nghỉ phép
          </span>
        );
      case 'off':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-danger">
            🔴 Nghỉ
          </span>
        );
      default:
        return null;
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void refetch()} />;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 bg-slate-100 dark:bg-slate-900/40 rounded-xl w-1/4 animate-pulse" />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Lịch sử chấm công
          </h1>
          <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1">
            Tra cứu, tìm kiếm và điều chỉnh lịch sử ca làm của bạn
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="p-4 md:p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 text-gray-950 placeholder-gray-400 font-medium rounded-2xl py-2.5 pl-10 pr-4 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-slate-900/40 dark:border-slate-800 dark:hover:border-slate-700/80 dark:focus:border-primary/50 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {/* Filter Dropdown & Sort Order */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl px-3 py-1.5 w-full sm:w-auto">
            <Calendar size={14} className="text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-gray-700 dark:text-gray-300 font-semibold text-xs focus:outline-none cursor-pointer w-full"
            >
              <option value="all">Tất cả các tháng</option>
              {availableMonths.map(m => {
                const [y, mm] = m.split('-');
                return (
                  <option key={m} value={m}>Tháng {mm}/{y}</option>
                );
              })}
            </select>
          </div>

          {/* Sort order toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 py-2 px-3 whitespace-nowrap h-[38px] rounded-2xl"
          >
            <ArrowUpDown size={14} />
            <span className="text-xs font-semibold">
              {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
            </span>
          </Button>
        </div>
      </Card>

      {/* Records Table Card */}
      {filteredRecords.length > 0 ? (
        <Card className="p-0 overflow-hidden border border-gray-100 dark:border-gray-900/50 shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/40 border-b border-gray-100 dark:border-gray-900/30 text-xs font-bold text-brandText-secondaryLight dark:text-brandText-secondaryDark uppercase tracking-wider">
                  <th className="px-6 py-4">Ngày</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Vào (Check In)</th>
                  <th className="px-6 py-4">Ra (Check Out)</th>
                  <th className="px-6 py-4">Giờ làm</th>
                  <th className="px-6 py-4 max-w-[280px]">Ghi chú</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50 dark:divide-gray-900/20 text-xs md:text-sm">
                {filteredRecords.map((record) => {
                  const dayName = getDayOfWeekName(record.date);
                  const formattedDateStr = record.date.split('-').reverse().join('/');
                  
                  return (
                    <tr 
                      key={record.date} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
                    >
                      {/* Date details */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {dayName}
                          </span>
                          <span className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark font-medium">
                            {formattedDateStr}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        {renderStatusBadge(record.status)}
                      </td>

                      {/* Check-in */}
                      <td className="px-6 py-4.5 whitespace-nowrap font-mono font-semibold text-gray-800 dark:text-gray-250">
                        {record.status === 'work' ? record.checkIn : '--:--'}
                      </td>

                      {/* Check-out */}
                      <td className="px-6 py-4.5 whitespace-nowrap font-mono font-semibold text-gray-800 dark:text-gray-250">
                        {record.status === 'work' ? (record.checkOut || '--:--') : '--:--'}
                      </td>

                      {/* Hours */}
                      <td className="px-6 py-4.5 whitespace-nowrap font-bold text-primary">
                        {record.status === 'work' && record.totalHours 
                          ? `${record.totalHours} giờ` 
                          : record.status === 'work'
                          ? 'Chưa ra'
                          : '-'}
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4.5 max-w-[280px] truncate font-medium text-gray-600 dark:text-gray-400">
                        {record.note || '-'}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(record)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary-soft/30 dark:hover:bg-primary-soft/10 rounded-xl transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record.date)}
                            className="p-2 text-gray-400 hover:text-danger hover:bg-danger-soft rounded-xl transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Empty State Illustration */
        <Card className="flex flex-col items-center justify-center p-12 text-center gap-4 border-dashed border-2 border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center text-4xl shadow-inner select-none">
            ✨
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              Hãy bắt đầu ghi lại ngày làm việc đầu tiên của bạn
            </h3>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1 max-w-sm mx-auto leading-relaxed font-medium">
              Không tìm thấy lịch sử chấm công khớp với bộ lọc tìm kiếm hiện tại của bạn.
            </p>
          </div>
        </Card>
      )}

      {/* 4. Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Sửa chấm công ngày ${editingRecord.date.split('-').reverse().join('/')}` : 'Chỉnh sửa'}
      >
        {editingRecord && (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-5 text-left">
            {/* Status Select */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                Trạng thái ngày công
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'work', label: 'Đi làm' },
                  { key: 'leave', label: 'Nghỉ phép' },
                  { key: 'off', label: 'Nghỉ' }
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

            {/* Check-in / Out Inputs */}
            {editStatus === 'work' && (
              <div className="grid grid-cols-2 gap-4 animate-fadeIn">
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

            {/* Note Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                Ghi chú
              </label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Nội dung công việc, lý do nghỉ, v.v..."
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-primary/50 text-gray-900 placeholder-gray-400 font-medium rounded-2xl py-3 px-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 dark:bg-slate-900/40 dark:border-slate-800/80 dark:focus:border-primary/50 dark:text-gray-100 dark:placeholder-gray-500 text-sm min-h-[90px] resize-none"
              />
            </div>

            {/* Actions Buttons */}
            <div className="flex justify-end gap-3 border-t border-gray-50 dark:border-gray-900/20 pt-4 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRecord(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={actionLoading}
              >
                Lưu thay đổi
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 5. Delete Confirm Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingRecordDate(null);
        }}
        title="Xác nhận xóa bản ghi"
      >
        <div className="flex flex-col gap-5 text-center items-center py-2">
          <AlertCircle size={56} className="text-danger animate-pulse" />
          <div>
            <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">Bạn chắc chắn muốn xóa bản ghi này?</h4>
            <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-2 max-w-[340px] leading-relaxed font-medium">
              Dữ liệu chấm công ngày {deletingRecordDate?.split('-').reverse().join('/')} sẽ bị xóa vĩnh viễn và không thể khôi phục lại.
            </p>
          </div>
          <div className="flex justify-center gap-3.5 w-full mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingRecordDate(null);
              }}
              className="px-6"
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
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
