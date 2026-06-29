# Personal Timekeeping Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed defects in the personal timekeeping application while preserving its existing React/Firebase architecture and restricting authentication to pre-created accounts.

**Architecture:** Extract deterministic attendance rules and serialized-data validation into pure modules, expose explicit auth/data error states, and keep Firebase and Demo Mode as separate fail-fast backends. Route-level lazy loading keeps chart code out of the initial bundle, while Vitest and Firebase Emulator tests lock down behavior.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Firebase 12, Zod 4, Vitest, React Testing Library, Firebase Rules Unit Testing.

---

### Task 1: Install and configure the test harness

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.app.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add a failing smoke test**

Create `src/lib/utils.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { calculateTotalHours } from './utils';

describe('calculateTotalHours', () => {
  it('rejects an equal start and end time', () => {
    expect(() => calculateTotalHours('08:00', '08:00')).toThrow('Thời lượng ca làm phải lớn hơn 0');
  });
});
```

- [ ] **Step 2: Install the test dependencies and verify RED**

Run: `npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @firebase/rules-unit-testing firebase-tools`

Add scripts `test`, `test:run`, `test:coverage`, and `test:rules`, configure jsdom plus `src/test/setup.ts`, then run `npm run test:run -- src/lib/utils.test.ts`.

Expected: FAIL because equal times currently return `0`.

- [ ] **Step 3: Commit the harness and failing test**

Run:

```bash
git add package.json package-lock.json tsconfig.app.json vite.config.ts src/test/setup.ts src/lib/utils.test.ts
git commit -m "test: add application test harness"
```

### Task 2: Implement strict attendance business rules

**Files:**
- Create: `src/lib/attendanceRules.ts`
- Create: `src/lib/attendanceRules.test.ts`
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/utils.test.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write failing business-rule tests**

Cover strict `YYYY-MM-DD` and `HH:mm` validation, equal-time rejection, `22:00` to `06:00` returning 8 hours, completed-shift selection preferring today then the latest prior open shift, completed-only streaks, completed-only average hours, salary, and target classification. Use this public API:

```ts
export type TargetHoursStatus = 'below' | 'met' | 'above';
export function validateAttendanceRecord(record: AttendanceRecord, today: string): AttendanceRecord;
export function findCheckoutRecord(records: AttendanceRecord[], today: string): AttendanceRecord | null;
export function calculateWorkStreak(records: AttendanceRecord[], today: string): number;
export function calculateAttendanceSummary(records: AttendanceRecord[], settings: UserSettings): AttendanceSummary;
export function classifyTargetHours(totalHours: number, target: number): TargetHoursStatus;
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm run test:run -- src/lib/utils.test.ts src/lib/attendanceRules.test.ts`

Expected: FAIL because `attendanceRules.ts` and strict validation do not exist.

- [ ] **Step 3: Implement the minimal pure functions**

Use local calendar dates, reject non-finite values and durations outside `(0, 24]`, clear time fields for `leave`/`off`, and count only completed `work` records in streak and averages.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:run -- src/lib/utils.test.ts src/lib/attendanceRules.test.ts`

Expected: all tests pass.

Run:

```bash
git add src/lib/utils.ts src/lib/utils.test.ts src/lib/attendanceRules.ts src/lib/attendanceRules.test.ts src/types/index.ts
git commit -m "fix: enforce attendance business rules"
```

### Task 3: Make Firebase and authentication fail closed

**Files:**
- Modify: `src/lib/firebase.ts`
- Create: `src/contexts/auth-context.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/AuthContext.test.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `src/components/PublicRoute.tsx`

- [ ] **Step 1: Write failing auth tests**

Assert that the context public value is:

```ts
interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  profileWarning: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retry(): void;
}
```

Verify there is no `registerUser`, login UI has no registration control, initialization errors render a blocking retryable error, stale profile completions cannot restore a logged-out user, and logout rejection keeps the session visible.

- [ ] **Step 2: Run auth tests and verify RED**

Run: `npm run test:run -- src/contexts/AuthContext.test.tsx`

Expected: FAIL because registration still exists and explicit auth error states do not.

- [ ] **Step 3: Implement fail-closed auth**

Export a discriminated Firebase service state from `firebase.ts`, split the hook into `auth-context.ts` to satisfy Fast Refresh, remove registration code/UI, use an auth-generation token to discard stale async profile work, and surface initialization/logout errors.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:run -- src/contexts/AuthContext.test.tsx`

Run:

```bash
git add src/lib/firebase.ts src/contexts/auth-context.ts src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx src/pages/Login.tsx src/components/ProtectedRoute.tsx src/components/PublicRoute.tsx
git commit -m "fix: make authentication fail closed"
```

### Task 4: Harden persistence and settings behavior

**Files:**
- Create: `src/lib/dataValidation.ts`
- Create: `src/lib/dataValidation.test.ts`
- Modify: `src/lib/firestore.ts`
- Create: `src/lib/firestore.test.ts`
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1: Write failing persistence tests**

Test malformed localStorage JSON, invalid Firestore-shaped records, intentional Demo Mode isolation, a missing settings document creating defaults, a network error rejecting rather than returning defaults, and save/delete rejections propagating unchanged.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:run -- src/lib/dataValidation.test.ts src/lib/firestore.test.ts`

Expected: FAIL because reads currently cast/parse without validation and settings errors return defaults.

- [ ] **Step 3: Implement schemas and error propagation**

Define Zod schemas for `AttendanceRecord`, `UserSettings`, and `UserProfile`. Parse every serialized read, use the business validator before writes, remove catch-and-default behavior, and ensure timeout timers are cleared when their operation settles.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:run -- src/lib/dataValidation.test.ts src/lib/firestore.test.ts`

Run:

```bash
git add src/lib/dataValidation.ts src/lib/dataValidation.test.ts src/lib/firestore.ts src/lib/firestore.test.ts src/lib/mockData.ts
git commit -m "fix: validate and propagate persistence failures"
```

### Task 5: Correct hooks and user-visible failure states

**Files:**
- Modify: `src/hooks/useAttendanceData.ts`
- Create: `src/hooks/useAttendanceData.test.tsx`
- Modify: `src/hooks/useSettingsData.ts`
- Create: `src/hooks/useSettingsData.test.tsx`
- Create: `src/components/ErrorState.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Attendance.tsx`
- Modify: `src/pages/History.tsx`
- Modify: `src/pages/Statistics.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Write failing hook and UI tests**

Verify checkout selects yesterday's latest open shift after midnight, load errors expose retry, failed delete/save reject and preserve modal state, settings errors do not expose defaults, and each successful action creates one toast.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:run -- src/hooks/useAttendanceData.test.tsx src/hooks/useSettingsData.test.tsx`

Expected: FAIL because hooks swallow mutation errors and do not support an earlier open shift.

- [ ] **Step 3: Implement hook state machines and page integration**

Return explicit `error`, `retry`, and mutation results; route all writes through strict validation; use `findCheckoutRecord`; keep modal state unchanged when a promise rejects; render `ErrorState`; derive dashboard/statistics metrics from `calculateAttendanceSummary`; compute date labels outside JSX.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:run -- src/hooks/useAttendanceData.test.tsx src/hooks/useSettingsData.test.tsx`

Run:

```bash
git add src/hooks src/components/ErrorState.tsx src/pages
git commit -m "fix: expose retryable application failures"
```

### Task 6: Repair and test Firestore Security Rules

**Files:**
- Modify: `firestore.rules`
- Create: `firebase.json`
- Create: `test/firestore.rules.test.ts`

- [ ] **Step 1: Write failing emulator tests**

Use two authenticated test contexts. Verify owner query/read/create/update/delete succeeds; cross-user access fails; malformed status/date/time and ownership/date changes fail; profiles/settings are owner-only; settings ranges require positive salary and `workHoursPerDay` between 1 and 24.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:rules`

Expected: FAIL because `startsWith` is unsupported and list rules do not match the `userId` query.

- [ ] **Step 3: Implement compatible owner and schema rules**

For attendance reads use `resource.data.userId == request.auth.uid`. For writes require `docId == request.auth.uid + '_' + request.resource.data.date`, immutable ownership/date on update, allowed key sets, valid status, string field types, and status-specific time presence.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm run test:rules`

Run:

```bash
git add firestore.rules firebase.json test/firestore.rules.test.ts package.json package-lock.json
git commit -m "fix: secure Firestore attendance access"
```

### Task 7: Resolve lint errors and split route bundles

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`
- Modify: `src/components/Button.tsx`
- Modify: `src/components/Card.tsx`
- Modify: `src/contexts/ThemeContext.tsx`
- Create: `src/contexts/theme-context.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/hooks/useAttendanceData.ts`
- Modify: `src/pages/Attendance.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/History.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/pages/Statistics.tsx`

- [ ] **Step 1: Add a lazy-route regression test**

Assert that `App.tsx` uses `React.lazy` for Dashboard, Attendance, History, Statistics, and Settings and renders them under one `Suspense` fallback.

- [ ] **Step 2: Verify RED**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because pages are imported eagerly.

- [ ] **Step 3: Implement lazy routes and repair lint findings**

Replace explicit `any` with Firebase/unknown-safe narrowing, split context hooks from provider component files, initialize form state from modal-open handlers instead of synchronous effects, remove unused assignments, and derive stable render values outside JSX.

- [ ] **Step 4: Verify tests, lint, and build; commit**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: tests pass, lint has zero findings, build succeeds with a separate statistics/Recharts chunk.

Run:

```bash
git add src
git commit -m "refactor: clean lint and lazy load routes"
```

### Task 8: Full verification and documentation sync

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Update behavior documentation**

Document existing-account-only login, intentional Demo Mode, fail-closed Firebase behavior, overnight checkout, validation constraints, test commands, and emulator-only rule verification. Ignore `.codegraph/`, coverage, and Firebase emulator artifacts.

- [ ] **Step 2: Run the complete verification gate**

Run:

```bash
npm run test:run
npm run test:rules
npm run lint
npm run build
git diff --check
```

Expected: every command exits `0`; no test failures, lint findings, TypeScript errors, or whitespace errors.

- [ ] **Step 3: Perform local browser verification**

Run the app with Firebase network calls intercepted or with a disposable emulator project. Verify login-only UI, blocked Firebase initialization, load-error retry, modal retention after failed mutations, overnight open-shift presentation, and desktop/mobile layout. Do not authenticate against or mutate production Firebase.

- [ ] **Step 4: Commit final documentation**

Run:

```bash
git add README.md .gitignore
git commit -m "docs: document stabilized timekeeping behavior"
```
