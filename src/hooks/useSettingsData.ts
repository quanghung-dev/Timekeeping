import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { UserSettings } from '../types';
import { neonClient } from '../lib/neonClient';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/theme-context';

const defaultSettings: UserSettings = {
  userId: '',
  salaryType: 'hourly',
  salaryAmount: 50000,
  workHoursPerDay: 8,
  theme: 'light',
  updatedAt: new Date().toISOString()
};

export function useSettingsData() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mapToCamelCase = (row: Record<string, any>): UserSettings => ({
    userId: row.user_id,
    salaryType: row.salary_type,
    salaryAmount: Number(row.salary_amount),
    workHoursPerDay: Number(row.work_hours_per_day),
    theme: row.theme,
    updatedAt: row.updated_at
  });

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await neonClient.query(
        'SELECT * FROM user_settings WHERE user_id = $1',
        [user.uid]
      );

      if (data && data.length > 0) {
        const loadedSettings = mapToCamelCase(data[0]);
        setSettings(loadedSettings);
        if (loadedSettings.theme) {
          setTheme(loadedSettings.theme);
        }
      } else {
        // Init default settings if not exist
        const initial = { ...defaultSettings, userId: user.uid };
        await neonClient.query(
          `INSERT INTO user_settings 
           (user_id, salary_type, salary_amount, work_hours_per_day, theme, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.uid, 
            initial.salaryType, 
            initial.salaryAmount, 
            initial.workHoursPerDay, 
            initial.theme, 
            initial.updatedAt, 
            initial.updatedAt
          ]
        );
        setSettings(initial);
        setTheme(initial.theme);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải cài đặt.';
      setError(msg);
      toast.error('Lỗi tải cài đặt');
    } finally {
      setLoading(false);
    }
  }, [user, setTheme]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSettings(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user || !settings) return;

    try {
      const updated = { ...settings, ...newSettings, updatedAt: new Date().toISOString() };
      
      // Update local state optimistically or wait? Let's wait.
      await neonClient.query(
        `UPDATE user_settings 
         SET salary_type = $1, salary_amount = $2, work_hours_per_day = $3, theme = $4, updated_at = $5 
         WHERE user_id = $6`,
        [
          updated.salaryType,
          updated.salaryAmount,
          updated.workHoursPerDay,
          updated.theme,
          updated.updatedAt,
          user.uid
        ]
      );

      setSettings(updated);
      
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
      
      toast.success('Đã lưu cài đặt');
    } catch (err: unknown) {
      toast.error('Lỗi lưu cài đặt: ' + (err instanceof Error ? err.message : 'Mạng lỗi'));
      // re-fetch to restore state
      fetchSettings();
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
}
