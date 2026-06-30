export type ProfileRow = Record<string, unknown> & {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SettingsRow = Record<string, unknown> & {
  user_id: string;
  salary_type: 'daily' | 'hourly';
  salary_amount: number;
  work_hours_per_day: number;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
};

export type AttendanceRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  status: 'work' | 'leave' | 'off';
  note: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        Omit<ProfileRow, 'avatar_url'> & { avatar_url?: string | null },
        Partial<Omit<ProfileRow, 'user_id'>>
      >;
      user_settings: Table<
        SettingsRow,
        SettingsRow,
        Partial<Omit<SettingsRow, 'user_id' | 'created_at'>>
      >;
      attendance_records: Table<
        AttendanceRow,
        Omit<AttendanceRow, 'id'> & { id?: string },
        Partial<Omit<AttendanceRow, 'id' | 'user_id' | 'created_at'>>
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
