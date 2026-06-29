import React, { useState, useEffect } from 'react';
import { useSettingsData } from '../hooks/useSettingsData';
import { useAuth } from '../contexts/auth-context';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { isDemoMode, auth, db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import type { SalaryType } from '../types';
import { 
  Settings as SettingsIcon, 
  Coins, 
  Sun, 
  Moon, 
  User as UserIcon, 
  UserCheck, 
  Hourglass,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading, saving, error, updateSettings, refetch } = useSettingsData();
  
  // Local form states
  const [salaryType, setSalaryType] = useState<SalaryType>('hourly');
  const [salaryAmount, setSalaryAmount] = useState<number>(50000);
  const [workHoursPerDay, setWorkHoursPerDay] = useState<number>(8);
  const [themePreference, setThemePreference] = useState<'light' | 'dark'>('light');
  
  // Profile modification states
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setSalaryType(settings.salaryType);
      setSalaryAmount(settings.salaryAmount);
      setWorkHoursPerDay(settings.workHoursPerDay);
      setThemePreference(settings.theme);
    }
  }, [settings]);

  // Sync display name when user loaded
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  if (error) return <ErrorState message={error} onRetry={() => void refetch()} />;

  if (loading || !settings || !user) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 bg-slate-100 dark:bg-slate-900/40 rounded-xl w-1/4 animate-pulse" />
        <div className="h-64 bg-slate-100 dark:bg-slate-900/40 rounded-3xl animate-pulse" />
      </div>
    );
  }

  // Handle saving general configurations
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        salaryType,
        salaryAmount,
        workHoursPerDay,
        theme: themePreference,
      });
    } catch (err) {
      // error handled in hook
    }
  };

  // Handle saving user profile name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Tên người dùng không được để trống.');
      return;
    }
    
    setIsSavingProfile(true);
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 300));
        // Update local session
        const session = localStorage.getItem('worklog_demo_session');
        if (session) {
          const profile = JSON.parse(session);
          profile.displayName = displayName;
          localStorage.setItem('worklog_demo_session', JSON.stringify(profile));
          // Note: to update UI instantly without full page reload, we can trigger AuthContext update.
          // Since our Context listens to local storage on start, a quick trick is updating context state:
          // In a real application we'd use state synchronizers. Here we refresh or update user.
          // Let's recommend simple page refresh or warn the user, or let's reload.
          // But wait, the hook handles it if we bind it. Since AuthContext manages state, we let user know it saved!
          // Let's reload window after saving profile to sync state.
        }
      } else {
        // Real Firebase update
        if (auth && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName });
          await setDoc(doc(db!, 'users', auth.currentUser.uid), {
            name: displayName
          }, { merge: true });
        }
      }
      toast.success('Cập nhật tên hiển thị thành công! Vui lòng tải lại trang để đồng bộ hoàn toàn.');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      toast.error('Lỗi khi lưu hồ sơ: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
          <SettingsIcon size={24} className="text-primary" />
          Cài đặt hệ thống
        </h1>
        <p className="text-sm text-brandText-secondaryLight dark:text-brandText-secondaryDark mt-1">
          Cấu hình cách tính lương, chỉ số giờ làm và cài đặt giao diện hiển thị
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left: General Configurations (2/3 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-6 md:p-8">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Coins size={20} className="text-primary" />
              Cấu hình lương & Định mức
            </h2>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
              
              {/* Salary Type Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                  Cách thức tính lương
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSalaryType('daily')}
                    className={`p-4 border rounded-2xl text-left transition-all flex flex-col gap-1.5 ${
                      salaryType === 'daily'
                        ? 'ring-2 ring-primary border-primary bg-primary-soft/10 text-primary'
                        : 'bg-slate-50 dark:bg-slate-900/10 border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Tính lương theo ngày</span>
                    <span className="text-[11px] opacity-75">Tự động nhân số ngày đi làm thực tế</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType('hourly')}
                    className={`p-4 border rounded-2xl text-left transition-all flex flex-col gap-1.5 ${
                      salaryType === 'hourly'
                        ? 'ring-2 ring-primary border-primary bg-primary-soft/10 text-primary'
                        : 'bg-slate-50 dark:bg-slate-900/10 border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Tính lương theo giờ</span>
                    <span className="text-[11px] opacity-75">Nhân số giờ thực làm (Check-in/out)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Salary Amount Input */}
                <Input
                  label={salaryType === 'daily' ? 'Mức lương mỗi ngày (VNĐ/ngày)' : 'Mức lương mỗi giờ (VNĐ/giờ)'}
                  type="number"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(Number(e.target.value))}
                  min={1}
                  required
                />

                {/* Target Hours per day */}
                <Input
                  label="Định mức giờ làm việc mỗi ngày (giờ)"
                  type="number"
                  value={workHoursPerDay}
                  onChange={(e) => setWorkHoursPerDay(Number(e.target.value))}
                  min={1}
                  max={24}
                  required
                  leftIcon={<Hourglass size={16} />}
                />
              </div>

              {/* Theme Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-brandText-secondaryLight dark:text-brandText-secondaryDark px-1">
                  Chủ đề giao diện (Dark Mode)
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setThemePreference('light')}
                    className={`flex-1 py-3 px-4 border rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      themePreference === 'light'
                        ? 'ring-2 ring-primary border-primary bg-primary-soft/10 text-primary'
                        : 'bg-slate-50 dark:bg-slate-900/10 border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Sun size={14} /> Giao diện Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemePreference('dark')}
                    className={`flex-1 py-3 px-4 border rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      themePreference === 'dark'
                        ? 'ring-2 ring-primary border-primary bg-primary-soft/10 text-primary'
                        : 'bg-slate-50 dark:bg-slate-900/10 border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Moon size={14} /> Giao diện Tối
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end border-t border-gray-50 dark:border-gray-900/20 pt-5 mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  className="px-8"
                >
                  Lưu cấu hình cài đặt
                </Button>
              </div>

            </form>
          </Card>
        </div>

        {/* Right: Profile Information (1/3 col) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Profile Card */}
          <Card className="p-6 text-center flex flex-col gap-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 justify-center">
              <UserIcon size={16} className="text-primary" />
              Thông tin tài khoản
            </h2>

            {/* Avatar display */}
            <div className="flex flex-col items-center gap-3">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`}
                alt="Avatar"
                className="w-20 h-20 rounded-3xl object-cover ring-4 ring-primary/10 shadow-soft"
              />
              <div>
                <span className="text-[10px] bg-primary-soft text-primary font-bold px-2.5 py-0.5 rounded-full select-none">
                  {isDemoMode ? 'Tài khoản Demo' : 'Nhân viên công ty'}
                </span>
              </div>
            </div>

            {/* Read-only details */}
            <div className="text-xs font-semibold text-left bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-900/20 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-brandText-secondaryLight dark:text-brandText-secondaryDark">Địa chỉ email</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono truncate max-w-[170px]">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brandText-secondaryLight dark:text-brandText-secondaryDark">Mã nhân viên</span>
                <span className="text-gray-900 dark:text-gray-100 font-mono truncate max-w-[170px]">{user.uid.substring(0, 10)}</span>
              </div>
            </div>

            {/* Edit Profile Name form */}
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-left border-t border-gray-50 dark:border-gray-900/20 pt-4">
              <Input
                label="Họ và tên người dùng"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                isLoading={isSavingProfile}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold"
              >
                <UserCheck size={14} /> Cập nhật tên hiển thị
              </Button>
            </form>
          </Card>

          {/* Quick Notice Card */}
          {isDemoMode && (
            <Card className="p-5 bg-gradient-to-br from-primary-soft/20 to-secondary-light/10 border border-primary/10 flex flex-col gap-2">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1 select-none">
                <Sparkles size={14} /> Gợi ý Trải nghiệm
              </h3>
              <p className="text-[11px] leading-relaxed text-brandText-secondaryLight dark:text-brandText-secondaryDark font-medium">
                Hãy thử thay đổi cách tính lương từ <strong>theo ngày</strong> sang <strong>theo giờ</strong>, sau đó quay lại trang <strong>Dashboard</strong> hoặc <strong>Thống kê</strong> để thấy toàn bộ các con số thu nhập dự tính thay đổi tức thời theo công thức mới của bạn!
              </p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};
