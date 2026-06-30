import { mapSettings, unwrap } from '../lib/databaseMappers';
import { neon } from '../lib/neon';
import type { UserSettings } from '../types';

export const settingsRepository = {
  async get(userId: string): Promise<UserSettings | null> {
    const rows = unwrap(
      await neon.from('user_settings').select('*').eq('user_id', userId),
      'Không thể tải cài đặt.',
    );
    return rows[0] ? mapSettings(rows[0]) : null;
  },

  async createDefault(userId: string, now = () => new Date()) {
    const timestamp = now().toISOString();
    const rows = unwrap(
      await neon
        .from('user_settings')
        .insert({
          user_id: userId,
          salary_type: 'hourly',
          salary_amount: 50000,
          work_hours_per_day: 8,
          theme: 'light',
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('*'),
      'Không thể tạo cài đặt.',
    );
    if (!rows[0]) throw new Error('Không thể tạo cài đặt.');
    return mapSettings(rows[0]);
  },

  async update(userId: string, settings: UserSettings) {
    const rows = unwrap(
      await neon
        .from('user_settings')
        .update({
          salary_type: settings.salaryType,
          salary_amount: settings.salaryAmount,
          work_hours_per_day: settings.workHoursPerDay,
          theme: settings.theme,
          updated_at: settings.updatedAt,
        })
        .eq('user_id', userId)
        .select('*'),
      'Không thể cập nhật cài đặt.',
    );
    if (!rows[0]) throw new Error('Không thể cập nhật cài đặt.');
    return mapSettings(rows[0]);
  },
};
