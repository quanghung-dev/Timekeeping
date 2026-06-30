# Neon Foundation Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken hand-written Neon transport with the official Neon SDK, restore persistent authentication, enforce typed repositories and validation, and make persistence failures recoverable before PWA feature work begins.

**Architecture:** A single official `@neondatabase/neon-js` client owns cookie-backed authentication, JWT injection, and PostgREST-compatible Data API calls. React context maps SDK sessions to the app's `UserProfile`; typed repositories own database row mapping and validation; hooks own UI state but never issue SQL or swallow persistence errors.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Zod, `@neondatabase/neon-js`, Neon Auth, Neon Data API, PostgreSQL RLS

---

## Scope

This plan implements phase 0 of the approved PWA design. IndexedDB, service workers, synchronization queues, analytics goals, JSON backup, and Web Push remain separate implementation plans because they are independently testable subsystems that depend on this foundation.

## File Structure

- `src/lib/neonConfig.ts`: validate browser-visible Neon endpoint configuration.
- `src/lib/database.types.ts`: generated-style database row, insert, and update types.
- `src/lib/neon.ts`: create the one official Neon client.
- `src/lib/databaseMappers.ts`: convert database rows to validated domain objects.
- `src/repositories/profileRepository.ts`: profile select/create/update operations.
- `src/repositories/attendanceRepository.ts`: attendance list/create/update/delete operations.
- `src/repositories/settingsRepository.ts`: settings select/create/update operations.
- `src/contexts/AuthContext.tsx`: hydrate, sign in, sign out, and expose recoverable auth errors.
- `src/hooks/useAttendanceData.ts`: call the attendance repository and propagate mutations failures.
- `src/hooks/useSettingsData.ts`: call the settings repository and propagate update failures.
- `scripts/migrations/001_initial_schema.sql`: Data API grants, RLS policies, and timestamp defaults.

### Task 1: Install the official Neon SDK and reject placeholder configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/neonConfig.ts`
- Create: `src/lib/neonConfig.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing configuration tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseNeonConfig } from './neonConfig';

describe('parseNeonConfig', () => {
  it('accepts real HTTPS Auth and Data API endpoints', () => {
    expect(parseNeonConfig({
      VITE_NEON_AUTH_URL: 'https://ep-demo.neonauth.us-east-2.aws.neon.tech/neondb/auth',
      VITE_NEON_DATA_API_URL: 'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
    })).toEqual({
      authUrl: 'https://ep-demo.neonauth.us-east-2.aws.neon.tech/neondb/auth',
      dataApiUrl: 'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
    });
  });

  it.each(['', 'https://your-neon-project.auth.neon.tech', 'http://localhost/auth'])(
    'rejects invalid Auth URL %s',
    (authUrl) => expect(() => parseNeonConfig({
      VITE_NEON_AUTH_URL: authUrl,
      VITE_NEON_DATA_API_URL: 'https://ep-demo.apirest.us-east-2.aws.neon.tech/neondb/rest/v1',
    })).toThrow('Cấu hình Neon không hợp lệ'),
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:run -- src/lib/neonConfig.test.ts`

Expected: FAIL because `./neonConfig` does not exist.

- [ ] **Step 3: Install the official unified SDK**

Run: `npm install @neondatabase/neon-js@0.6.2-beta`

Expected: `package.json` and `package-lock.json` include `@neondatabase/neon-js`.

- [ ] **Step 4: Implement strict configuration parsing**

```ts
type NeonEnvironment = {
  VITE_NEON_AUTH_URL?: string;
  VITE_NEON_DATA_API_URL?: string;
};

export type NeonConfig = { authUrl: string; dataApiUrl: string };

function validEndpoint(value: string | undefined, suffix: string): value is string {
  if (!value || value.includes('your-neon-project')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.endsWith(suffix);
  } catch {
    return false;
  }
}

export function parseNeonConfig(env: NeonEnvironment): NeonConfig {
  if (!validEndpoint(env.VITE_NEON_AUTH_URL, '/auth') ||
      !validEndpoint(env.VITE_NEON_DATA_API_URL, '/rest/v1')) {
    throw new Error('Cấu hình Neon không hợp lệ. Hãy kiểm tra Auth URL và Data API URL.');
  }
  return { authUrl: env.VITE_NEON_AUTH_URL, dataApiUrl: env.VITE_NEON_DATA_API_URL };
}

export const neonConfig = parseNeonConfig(import.meta.env);
```

- [ ] **Step 5: Correct `.env.example` endpoint formats**

```env
VITE_NEON_AUTH_URL=https://ep-example.neonauth.us-east-2.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-example.apirest.us-east-2.aws.neon.tech/neondb/rest/v1
DATABASE_URL=postgresql://neondb_owner:password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

- [ ] **Step 6: Run the focused test and commit**

Run: `npm run test:run -- src/lib/neonConfig.test.ts`

Expected: PASS.

```bash
git add package.json package-lock.json .env.example src/lib/neonConfig.ts src/lib/neonConfig.test.ts
git commit -m "fix: validate Neon client configuration"
```

### Task 2: Create the typed Neon client and database contract

**Files:**
- Create: `src/lib/database.types.ts`
- Create: `src/lib/neon.ts`
- Delete: `src/lib/neonClient.ts`
- Create: `src/lib/neon.test.ts`

- [ ] **Step 1: Write a failing client smoke test**

```ts
import { describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => ({ auth: {}, from: vi.fn() }));
vi.mock('@neondatabase/neon-js', () => ({
  createClient,
  SupabaseAuthAdapter: vi.fn(() => 'adapter'),
}));
vi.mock('./neonConfig', () => ({
  neonConfig: { authUrl: 'https://auth.test/auth', dataApiUrl: 'https://data.test/rest/v1' },
}));

describe('neon', () => {
  it('creates one client with the Supabase-compatible auth adapter', async () => {
    await import('./neon');
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({
      auth: { adapter: 'adapter', url: 'https://auth.test/auth' },
      dataApi: { url: 'https://data.test/rest/v1' },
    });
  });
});
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run: `npm run test:run -- src/lib/neon.test.ts`

Expected: FAIL because `src/lib/neon.ts` does not exist.

- [ ] **Step 3: Define generated-style table types**

```ts
export type ProfileRow = {
  user_id: string; display_name: string; avatar_url: string | null;
  created_at: string; updated_at: string;
};
export type SettingsRow = {
  user_id: string; salary_type: 'daily' | 'hourly'; salary_amount: number;
  work_hours_per_day: number; theme: 'light' | 'dark';
  created_at: string; updated_at: string;
};
export type AttendanceRow = {
  id: string; user_id: string; date: string; check_in: string;
  check_out: string | null; total_hours: number | null;
  status: 'work' | 'leave' | 'off'; note: string | null;
  created_at: string; updated_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row; Insert: Insert; Update: Update; Relationships: [];
};

export type Database = { public: { Tables: {
  profiles: Table<ProfileRow>;
  user_settings: Table<SettingsRow>;
  attendance_records: Table<AttendanceRow>;
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never> } };
```

- [ ] **Step 4: Create the official client**

```ts
import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
import type { Database } from './database.types';
import { neonConfig } from './neonConfig';

export const neon = createClient<Database>({
  auth: { adapter: SupabaseAuthAdapter(), url: neonConfig.authUrl },
  dataApi: { url: neonConfig.dataApiUrl },
});
```

- [ ] **Step 5: Run the focused test and remove the SQL transport**

Run: `npm run test:run -- src/lib/neon.test.ts`

Expected: PASS.

Delete `src/lib/neonClient.ts` only after all imports are migrated in Tasks 3–5.

- [ ] **Step 6: Commit the typed client**

```bash
git add src/lib/database.types.ts src/lib/neon.ts src/lib/neon.test.ts
git commit -m "refactor: use official Neon SDK"
```

### Task 3: Add validated repositories

**Files:**
- Create: `src/lib/databaseMappers.ts`
- Create: `src/repositories/profileRepository.ts`
- Create: `src/repositories/attendanceRepository.ts`
- Create: `src/repositories/settingsRepository.ts`
- Create: `src/repositories/repositories.test.ts`
- Modify: `src/lib/dataValidation.ts`

- [ ] **Step 1: Write repository tests with a chainable Neon mock**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileRepository } from './profileRepository';

const from = vi.fn();
vi.mock('../lib/neon', () => ({ neon: { from } }));

describe('profileRepository.ensure', () => {
  beforeEach(() => from.mockReset());

  it('creates a complete first-login profile when none exists', async () => {
    const selectChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const insertChain = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue({
      data: [{ user_id: 'u1', display_name: 'User', avatar_url: null,
        created_at: '2026-06-30T00:00:00.000Z', updated_at: '2026-06-30T00:00:00.000Z' }], error: null,
    }) };
    from.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

    await expect(profileRepository.ensure({ id: 'u1', email: 'u@example.com', name: 'User' },
      () => new Date('2026-06-30T00:00:00.000Z'))).resolves.toMatchObject({ uid: 'u1', displayName: 'User' });
    expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1', created_at: '2026-06-30T00:00:00.000Z', updated_at: '2026-06-30T00:00:00.000Z',
    }));
  });
});
```

- [ ] **Step 2: Run the repository test and verify it fails**

Run: `npm run test:run -- src/repositories/repositories.test.ts`

Expected: FAIL because repository modules do not exist.

- [ ] **Step 3: Implement shared result unwrapping and row mappers**

```ts
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }, message: string): T {
  if (result.error) throw new Error(`${message}: ${result.error.message}`);
  if (result.data === null) throw new Error(message);
  return result.data;
}
```

Map snake_case database rows to `UserProfile`, `AttendanceRecord`, and `UserSettings`, then call `parseUserProfile`, `parseAttendanceRecord(s)`, or `parseUserSettings` before returning. Normalize nullable database fields to `undefined` in domain objects.

- [ ] **Step 4: Implement `profileRepository`**

```ts
export const profileRepository = {
  async ensure(user: { id: string; email: string; name?: string | null }, now = () => new Date()) {
    const existing = unwrap(await neon.from('profiles').select('*').eq('user_id', user.id), 'Không thể tải hồ sơ.');
    if (existing[0]) return mapProfile(existing[0], user.email);
    const timestamp = now().toISOString();
    const created = unwrap(await neon.from('profiles').insert({
      user_id: user.id,
      display_name: user.name?.trim() || user.email.split('@')[0],
      avatar_url: null,
      created_at: timestamp,
      updated_at: timestamp,
    }).select('*'), 'Không thể tạo hồ sơ.');
    return mapProfile(created[0], user.email);
  },
  async updateDisplayName(userId: string, email: string, displayName: string) {
    const updated = unwrap(await neon.from('profiles').update({
      display_name: displayName, updated_at: new Date().toISOString(),
    }).eq('user_id', userId).select('*'), 'Không thể cập nhật hồ sơ.');
    return mapProfile(updated[0], email);
  },
};
```

- [ ] **Step 5: Implement attendance and settings repositories**

Expose explicit methods instead of raw SQL:

```ts
attendanceRepository.list(userId)
attendanceRepository.create(record)
attendanceRepository.update(userId, date, changes)
attendanceRepository.remove(userId, date)
settingsRepository.get(userId)
settingsRepository.createDefault(userId, now)
settingsRepository.update(userId, changes)
```

Every method must call `unwrap`, map the returned row, and validate it before returning. `remove` must throw when the Data API returns an error.

- [ ] **Step 6: Run tests and commit repositories**

Run: `npm run test:run -- src/repositories/repositories.test.ts src/lib/dataValidation.test.ts`

Expected: PASS.

```bash
git add src/lib/dataValidation.ts src/lib/databaseMappers.ts src/repositories
git commit -m "refactor: add validated Neon repositories"
```

### Task 4: Hydrate persistent authentication without global login failures

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/auth-context.ts`
- Create: `src/contexts/AuthContext.test.tsx`
- Modify: `src/components/PublicRoute.tsx`
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `src/components/AuthRoutes.test.tsx`

- [ ] **Step 1: Write failing authentication behavior tests**

Test these exact behaviors:

```ts
it('hydrates an existing SDK session after reload');
it('keeps invalid credentials on the login form instead of showing initialization failure');
it('clears a recoverable login error before the next attempt');
it('signs out through the SDK and clears the user');
```

Mock `neon.auth.getSession`, `signInWithPassword`, `signOut`, and `onAuthStateChange`, plus `profileRepository.ensure`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm run test:run -- src/contexts/AuthContext.test.tsx src/components/AuthRoutes.test.tsx`

Expected: FAIL because the context uses the in-memory custom client and exposes login errors as initialization errors.

- [ ] **Step 3: Split initialization and login errors in the context contract**

```ts
export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  initializationError: string | null;
  loginError: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retry(): void;
}
```

- [ ] **Step 4: Implement SDK session hydration and authentication**

On mount, call `neon.auth.getSession()`. If a session user exists, call `profileRepository.ensure` and set the profile. Subscribe to `onAuthStateChange` and unsubscribe on cleanup. `login` calls `signInWithPassword`, then ensures the profile. A login failure sets only `loginError` and throws. `retry` clears `initializationError` and reruns hydration. `logout` awaits `neon.auth.signOut()` before clearing the local user.

- [ ] **Step 5: Restrict full-screen route errors to initialization failures**

Update `PublicRoute` and `ProtectedRoute` to read `initializationError`. `Login.tsx` reads `loginError` through context or continues to show the thrown message in its toast; neither path replaces the form.

- [ ] **Step 6: Run tests and commit**

Run: `npm run test:run -- src/contexts/AuthContext.test.tsx src/components/AuthRoutes.test.tsx`

Expected: PASS.

```bash
git add src/contexts src/components/PublicRoute.tsx src/components/ProtectedRoute.tsx src/components/AuthRoutes.test.tsx
git commit -m "fix: restore persistent Neon authentication"
```

### Task 5: Move attendance and settings hooks onto repositories

**Files:**
- Modify: `src/hooks/useAttendanceData.ts`
- Modify: `src/hooks/useSettingsData.ts`
- Create: `src/hooks/useAttendanceData.test.tsx`
- Create: `src/hooks/useSettingsData.test.tsx`
- Modify: `src/pages/Settings.tsx`
- Delete: `src/lib/neonClient.ts`

- [ ] **Step 1: Write failing hook mutation tests**

```ts
it('rejects saveRecord when the attendance repository rejects');
it('rejects deleteRecord when the attendance repository rejects');
it('keeps the existing attendance list after a failed mutation');
it('rejects updateSettings and restores server state after failure');
```

Mock repository methods and assert both the returned promise and visible state. Do not assert only toast calls.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm run test:run -- src/hooks/useAttendanceData.test.tsx src/hooks/useSettingsData.test.tsx`

Expected: FAIL because hook catch blocks currently swallow errors.

- [ ] **Step 3: Replace SQL calls with repository calls**

`fetchRecords` calls `attendanceRepository.list`. Check-in calls `create`; checkout and manual edits call `update`; new manual records call `create`; deletion calls `remove`. Settings uses `get`, `createDefault`, and `update`.

- [ ] **Step 4: Rethrow mutation failures after displaying feedback**

```ts
} catch (error: unknown) {
  const normalized = error instanceof Error ? error : new Error('Lỗi không xác định');
  toast.error(`Không thể lưu bản ghi: ${normalized.message}`);
  throw normalized;
} finally {
  setActionLoading(false);
}
```

Apply the same rule to delete and settings update. Fetch methods keep errors in hook state because pages render retryable `ErrorState` components.

- [ ] **Step 5: Move profile updates onto `profileRepository` and remove the old client**

Replace dynamic `neonClient` import in `Settings.tsx` with `profileRepository.updateDisplayName`. Remove `src/lib/neonClient.ts` after `rg -n "neonClient" src` returns no matches.

- [ ] **Step 6: Run tests and commit**

Run: `npm run test:run -- src/hooks/useAttendanceData.test.tsx src/hooks/useSettingsData.test.tsx`

Expected: PASS.

```bash
git add src/hooks src/pages/Settings.tsx src/repositories src/lib/neonClient.ts
git commit -m "fix: propagate Neon persistence failures"
```

### Task 6: Make the migration compatible with Neon Data API and first login

**Files:**
- Modify: `scripts/migrations/001_initial_schema.sql`
- Modify: `scripts/migrate.js`
- Create: `src/test/migrationContract.test.ts`

- [ ] **Step 1: Write a migration contract test**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Neon migration contract', () => {
  const sql = readFileSync('scripts/migrations/001_initial_schema.sql', 'utf8');
  it('uses server timestamp defaults and authenticated grants', () => {
    expect(sql).toContain('DEFAULT CURRENT_TIMESTAMP');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE');
    expect(sql).toContain('TO authenticated');
  });
  it('does not replace the Data API auth schema', () => {
    expect(sql).not.toContain('CREATE SCHEMA IF NOT EXISTS auth');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION auth.user_id');
  });
});
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `npm run test:run -- src/test/migrationContract.test.ts`

Expected: FAIL against the current migration.

- [ ] **Step 3: Correct schema defaults, grants, and RLS policies**

Use `TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` for created and updated timestamps. Grant `USAGE` on schema `public` and table-specific `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges to `authenticated`. Keep RLS enabled and use `auth.user_id() = user_id` in policies. Do not create or replace Neon's managed `auth` schema or function.

- [ ] **Step 4: Make migration execution transactional and placeholder-safe**

Reject `DATABASE_URL` values containing `user:password`, `your-neon-project`, or a username equal to `user`. Wrap each migration in `BEGIN`/`COMMIT`, call `ROLLBACK` on failure, and always close the client.

- [ ] **Step 5: Run the migration contract test and commit**

Run: `npm run test:run -- src/test/migrationContract.test.ts`

Expected: PASS.

```bash
git add scripts/migrations/001_initial_schema.sql scripts/migrate.js src/test/migrationContract.test.ts
git commit -m "fix: secure Neon Data API migration"
```

### Task 7: Verify route behavior and user-visible recovery

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/History.tsx`
- Modify: `src/pages/Attendance.tsx`
- Create: `src/pages/PersistenceRecovery.test.tsx`

- [ ] **Step 1: Add component regressions**

Test that invalid credentials leave the login form visible, failed history edit keeps the edit modal open, failed delete keeps the confirmation open, and failed manual attendance save keeps the note value.

- [ ] **Step 2: Run the component test and verify it fails where current behavior is wrong**

Run: `npm run test:run -- src/pages/PersistenceRecovery.test.tsx`

Expected: at least the failed manual save assertion FAILS before page behavior is corrected.

- [ ] **Step 3: Implement minimal UI corrections**

Only clear form state and close modals after awaited repository-backed hook calls resolve. Render login errors adjacent to the form while leaving inputs editable. Keep toast messages as secondary feedback.

- [ ] **Step 4: Run component tests and commit**

Run: `npm run test:run -- src/pages/PersistenceRecovery.test.tsx`

Expected: PASS.

```bash
git add src/pages
git commit -m "fix: keep failed persistence actions recoverable"
```

### Task 8: Documentation and full verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Document Neon Console prerequisites**

Document that the Auth URL and Data API URL must be copied from the same Neon branch, Data API and Neon Auth must both be enabled, the deployed origin must be allowed in Neon Auth, and `DATABASE_URL` is used only by migration tooling.

- [ ] **Step 2: Run the full quality gate**

Run: `npm run test:run && npm run lint && npm run build`

Expected: all tests pass, ESLint exits 0, TypeScript and Vite build exit 0.

- [ ] **Step 3: Verify no legacy transport remains**

Run: `rg -n "neonClient|api/auth/sign-in/email|JSON.stringify\(\{ query" src README.md .env.example`

Expected: no matches.

- [ ] **Step 4: Verify a real environment when credentials are available**

Run: `node scripts/migrate.js`, start `npm run dev`, then verify sign-in, reload session hydration, first-login profile creation, attendance create/update/delete, settings update, and sign-out in the browser. If the local `.env` still contains placeholders, report this external blocker without replacing it or committing credentials.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md .env.example
git commit -m "docs: document Neon foundation setup"
```

## Official References

- Neon SDK package README: `npm view @neondatabase/neon-js readme`
- Neon Auth and Data API overview: `https://neon.com/blog/neon-auth-branchable-identity-in-your-database`
- Neon Data API and RLS guide: `https://neon.com/docs/guides/row-level-security`
