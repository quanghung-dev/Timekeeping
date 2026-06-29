-- 001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: user_settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
    salary_type TEXT NOT NULL CHECK (salary_type IN ('hourly', 'daily')),
    salary_amount NUMERIC(10, 2) NOT NULL CHECK (salary_amount >= 0),
    work_hours_per_day NUMERIC(4, 2) NOT NULL CHECK (work_hours_per_day > 0),
    theme TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Table: attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- Format: YYYY-MM-DD
    check_in TEXT NOT NULL, -- HH:mm
    check_out TEXT, -- HH:mm
    total_hours NUMERIC(5, 2),
    status TEXT NOT NULL CHECK (status IN ('work', 'leave', 'off', 'empty')),
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, date)
);

-- Row Level Security (RLS) Setup

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub';
$$ LANGUAGE SQL STABLE;

-- Profiles
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (user_id = auth.user_id());

-- User Settings
CREATE POLICY "Users can read own settings" ON user_settings FOR SELECT USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (user_id = auth.user_id());

-- Attendance Records
CREATE POLICY "Users can read own attendance" ON attendance_records FOR SELECT USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own attendance" ON attendance_records FOR INSERT WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own attendance" ON attendance_records FOR UPDATE USING (user_id = auth.user_id());
CREATE POLICY "Users can delete own attendance" ON attendance_records FOR DELETE USING (user_id = auth.user_id());
