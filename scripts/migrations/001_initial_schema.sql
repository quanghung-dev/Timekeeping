CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id TEXT PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    salary_type TEXT NOT NULL CHECK (salary_type IN ('hourly', 'daily')),
    salary_amount NUMERIC(10, 2) NOT NULL CHECK (salary_amount >= 0),
    work_hours_per_day NUMERIC(4, 2) NOT NULL CHECK (work_hours_per_day > 0),
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT,
    total_hours NUMERIC(5, 2),
    status TEXT NOT NULL CHECK (status IN ('work', 'leave', 'off')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, date)
);

-- Upgrade timestamp columns created by the earlier Firebase-to-Neon migration.
ALTER TABLE public.profiles
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.user_settings
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.attendance_records
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz,
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Apply strict checks to new writes without blocking deployment on legacy rows.
ALTER TABLE public.user_settings
    DROP CONSTRAINT IF EXISTS user_settings_salary_amount_check,
    DROP CONSTRAINT IF EXISTS user_settings_work_hours_per_day_check,
    DROP CONSTRAINT IF EXISTS user_settings_salary_positive,
    DROP CONSTRAINT IF EXISTS user_settings_work_hours_range;

ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_salary_positive
        CHECK (salary_amount > 0) NOT VALID,
    ADD CONSTRAINT user_settings_work_hours_range
        CHECK (work_hours_per_day BETWEEN 1 AND 24) NOT VALID;

ALTER TABLE public.attendance_records
    DROP CONSTRAINT IF EXISTS attendance_date_valid,
    DROP CONSTRAINT IF EXISTS attendance_check_in_valid,
    DROP CONSTRAINT IF EXISTS attendance_check_out_valid,
    DROP CONSTRAINT IF EXISTS attendance_total_hours_range,
    DROP CONSTRAINT IF EXISTS attendance_status_time_consistency;

ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_date_valid
        CHECK (
            date ~ '^\d{4}-\d{2}-\d{2}$'
            AND date::date::text = date
        ) NOT VALID,
    ADD CONSTRAINT attendance_check_in_valid
        CHECK (
            check_in = ''
            OR check_in ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        ) NOT VALID,
    ADD CONSTRAINT attendance_check_out_valid
        CHECK (
            check_out IS NULL
            OR check_out ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        ) NOT VALID,
    ADD CONSTRAINT attendance_total_hours_range
        CHECK (
            total_hours IS NULL
            OR (total_hours > 0 AND total_hours <= 24)
        ) NOT VALID,
    ADD CONSTRAINT attendance_status_time_consistency
        CHECK (
            (
                status = 'work'
                AND check_in <> ''
                AND (
                    (check_out IS NULL AND total_hours IS NULL)
                    OR (check_out IS NOT NULL AND total_hours IS NOT NULL)
                )
            )
            OR (
                status IN ('leave', 'off')
                AND check_in = ''
                AND check_out IS NULL
                AND total_hours IS NULL
            )
        ) NOT VALID;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings" ON public.user_settings
    FOR SELECT TO authenticated USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE TO authenticated
    USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can read own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can delete own attendance" ON public.attendance_records;
CREATE POLICY "Users can read own attendance" ON public.attendance_records
    FOR SELECT TO authenticated USING (user_id = auth.user_id());
CREATE POLICY "Users can insert own attendance" ON public.attendance_records
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can update own attendance" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (user_id = auth.user_id())
    WITH CHECK (user_id = auth.user_id());
CREATE POLICY "Users can delete own attendance" ON public.attendance_records
    FOR DELETE TO authenticated USING (user_id = auth.user_id());
