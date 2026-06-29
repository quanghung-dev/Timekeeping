import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { UserSettings } from '../types';
import { getUserSettings, saveUserSettings } from '../lib/firestore';
import { useTheme } from '../contexts/theme-context';
import toast from 'react-hot-toast';

export function useSettingsData() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await getUserSettings(user.uid);
      setSettings(data);
      // Sync ThemeContext with the loaded setting
      if (data.theme) {
        setTheme(data.theme);
      }
    } catch (err: unknown) {
      console.error("Error loading settings", err);
      setSettings(null);
      setError(err instanceof Error ? err.message : 'Không thể tải cấu hình cài đặt.');
      toast.error('Lỗi khi tải cấu hình cài đặt.');
    } finally {
      setLoading(false);
    }
  }, [user, setTheme]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSettings(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchSettings]);

  const updateSettings = async (updatedFields: Partial<UserSettings>): Promise<void> => {
    if (!user || !settings) {
      throw new Error('Cấu hình chưa sẵn sàng để lưu.');
    }
    
    try {
      setSaving(true);
      const newSettings: UserSettings = {
        ...settings,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      
      await saveUserSettings(newSettings);
      setSettings(newSettings);
      
      // If theme was changed, trigger theme change
      if (updatedFields.theme) {
        setTheme(updatedFields.theme);
      }
      
      toast.success('Đã lưu cài đặt thành công! ✨');
    } catch (err) {
      console.error("Error saving settings", err);
      toast.error('Không thể lưu cài đặt.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}
