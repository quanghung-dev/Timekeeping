import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import type { UserSettings } from '../types';
import { settingsRepository } from '../repositories/settingsRepository';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/theme-context';

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
      
      const loadedSettings = await settingsRepository.get(user.uid);

      if (loadedSettings) {
        setSettings(loadedSettings);
        if (loadedSettings.theme) {
          setTheme(loadedSettings.theme);
        }
      } else {
        const initial = await settingsRepository.createDefault(user.uid);
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

    setSaving(true);
    try {
      const updated = { ...settings, ...newSettings, updatedAt: new Date().toISOString() };
      
      // Update local state optimistically or wait? Let's wait.
      setSettings(await settingsRepository.update(user.uid, updated));
      
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
      
      toast.success('Đã lưu cài đặt');
    } catch (err: unknown) {
      const normalized = err instanceof Error ? err : new Error('Mạng lỗi');
      toast.error('Lỗi lưu cài đặt: ' + normalized.message);
      await fetchSettings();
      throw normalized;
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
    refetch: fetchSettings
  };
}
