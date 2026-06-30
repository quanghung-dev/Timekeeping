# Main Logic Reliability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Neon foundation into `main` and remove the confirmed logic failures in deletion, shift state, startup, authentication, mobile logout, search, settings, validation, and legacy tooling.

**Architecture:** Keep repositories as the only Data API boundary, move reusable shift/search decisions into pure functions, and lazily create the Neon client so React owns initialization errors. Preserve existing UI structure while making Auth/profile creation idempotent and enforcing new-write integrity in both client validation and PostgreSQL constraints.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Neon JS/Data API, PostgreSQL migration SQL, Vite.

---

### Task 1: Merge the Neon foundation into `main`

**Files:**
- Merge source: `codex/neon-foundation`
- Verify: `package.json`
- Verify: `src/lib/neon.ts`
- Verify: `src/repositories/attendanceRepository.ts`

- [ ] **Step 1: Confirm the merge inputs are clean**

Run:

```powershell
git status --short
git branch --show-current
git log --oneline main..codex/neon-foundation
```

Expected: empty status, current branch `main`, and eight Neon foundation commits listed.

- [ ] **Step 2: Merge the foundation history**

Run:

```powershell
git merge --no-ff codex/neon-foundation -m "merge: integrate Neon foundation"
```

Expected: merge succeeds without conflicts because the `main`-only change is the reliability design document.

- [ ] **Step 3: Run the foundation baseline**

Run:

```powershell
npm run test:run
npm run lint
npm run build
```

Expected: 45 tests pass; lint and build exit 0. The existing Vite chunk-size warning is allowed.

### Task 2: Treat a no-content delete as success

**Files:**
- Modify: `src/repositories/attendanceRepository.ts:67-74`
- Test: `src/repositories/repositories.test.ts`

- [ ] **Step 1: Add the failing successful-delete test**

Add beside the existing failed-delete test:

```ts
it('accepts a successful delete with no response body', async () => {
  const eq = vi.fn();
  const chain = {
    delete: vi.fn().mockReturnThis(),
    eq,
  };
  eq
    .mockReturnValueOnce(chain)
    .mockResolvedValueOnce({ data: null, error: null });
  sdk.from.mockReturnValue(chain);

  await expect(
    attendanceRepository.remove('u1', '2026-06-30'),
  ).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm run test:run -- src/repositories/repositories.test.ts
```

Expected: the new test fails with `Không thể xóa bản ghi chấm công.` because `unwrap` rejects `data: null`.

- [ ] **Step 3: Check only the delete error field**

Replace the final delete handling with:

```ts
const result = await neon
  .from('attendance_records')
  .delete()
  .eq('user_id', userId)
  .eq('date', date);

if (result.error) {
  throw new Error(`Không thể xóa bản ghi chấm công.: ${result.error.message}`);
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
npm run test:run -- src/repositories/repositories.test.ts src/hooks/useAttendanceData.test.tsx
```

Expected: successful and failed delete tests pass.

- [ ] **Step 5: Commit the delete fix**

```powershell
git add src/repositories/attendanceRepository.ts src/repositories/repositories.test.ts
git commit -m "fix: accept no-content attendance deletes"
```

### Task 3: Correct Dashboard shift state and overnight duration

**Files:**
- Modify: `src/lib/attendanceRules.ts`
- Modify: `src/lib/attendanceRules.test.ts`
- Modify: `src/hooks/useAttendanceData.ts`
- Modify: `src/hooks/useAttendanceData.test.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add failing pure-rule tests**

Add tests that express the three Dashboard states and duration guard:

```ts
it('offers checkout for an open shift from the previous day', () => {
  const open = record({ date: '2026-06-30', checkOut: undefined, totalHours: undefined });
  expect(resolveAttendanceAction(null, open)).toEqual({ kind: 'check-out', record: open });
});

it('treats a leave record as closed rather than waiting for checkout', () => {
  const leave = record({ status: 'leave', checkIn: '', checkOut: undefined, totalHours: undefined });
  expect(resolveAttendanceAction(leave, null)).toEqual({ kind: 'closed', record: leave });
});

it('calculates an overnight shift from the record date', () => {
  const open = record({ date: '2026-06-30', checkIn: '22:00', checkOut: undefined });
  expect(calculateCheckoutHours(open, new Date(2026, 6, 1, 6, 0))).toBe(8);
});

it('rejects automatic checkout after more than 24 hours', () => {
  const open = record({ date: '2026-06-29', checkIn: '08:00', checkOut: undefined });
  expect(() => calculateCheckoutHours(open, new Date(2026, 6, 1, 9, 0))).toThrow(
    'Ca làm đã mở quá 24 giờ',
  );
});
```

- [ ] **Step 2: Verify RED for missing rule APIs**

Run:

```powershell
npm run test:run -- src/lib/attendanceRules.test.ts
```

Expected: compile/test failure because `resolveAttendanceAction` and `calculateCheckoutHours` do not exist.

- [ ] **Step 3: Implement the pure state and duration rules**

Add to `attendanceRules.ts`:

```ts
export type AttendanceAction =
  | { kind: 'check-in' }
  | { kind: 'check-out'; record: AttendanceRecord }
  | { kind: 'closed'; record: AttendanceRecord };

export function resolveAttendanceAction(
  todayRecord: AttendanceRecord | null,
  checkoutRecord: AttendanceRecord | null,
): AttendanceAction {
  if (checkoutRecord) return { kind: 'check-out', record: checkoutRecord };
  if (todayRecord) return { kind: 'closed', record: todayRecord };
  return { kind: 'check-in' };
}

export function calculateCheckoutHours(
  record: AttendanceRecord,
  checkoutAt: Date,
): number {
  const startDate = parseLocalDate(record.date);
  const [hours, minutes] = record.checkIn.split(':').map(Number);
  startDate.setHours(hours, minutes, 0, 0);
  const durationMinutes = (checkoutAt.getTime() - startDate.getTime()) / 60_000;
  if (durationMinutes <= 0) throw new Error('Giờ Check Out phải sau Check In.');
  if (durationMinutes > 24 * 60) {
    throw new Error('Ca làm đã mở quá 24 giờ. Vui lòng chỉnh sửa thủ công.');
  }
  return Math.round((durationMinutes / 60) * 100) / 100;
}
```

- [ ] **Step 4: Verify the pure rules are GREEN**

Run:

```powershell
npm run test:run -- src/lib/attendanceRules.test.ts
```

Expected: all attendance rule tests pass.

- [ ] **Step 5: Add a failing hook test for date-aware checkout**

Mock an open record dated the previous day, set the system time to the next morning, call `checkOut()`, and assert:

```ts
expect(attendanceRepository.update).toHaveBeenCalledWith(
  'u1',
  '2026-06-30',
  expect.objectContaining({ checkOut: '06:00', totalHours: 8 }),
);
```

- [ ] **Step 6: Verify the hook test is RED**

Run:

```powershell
npm run test:run -- src/hooks/useAttendanceData.test.tsx
```

Expected: the update receives a clock-only duration or the fixture cannot close the previous-day shift.

- [ ] **Step 7: Wire the duration and validation into the hook**

Use `calculateCheckoutHours(checkoutRecord, now)` in `checkOut`. In `checkIn` and `saveRecord`, construct the complete candidate record, then call:

```ts
const validated = validateAttendanceRecord(candidate, todayStr);
```

Pass `validated` fields to repository create/update so non-work times are normalized and invalid dates/times never reach Data API.

- [ ] **Step 8: Use the resolved action in Dashboard**

Destructure `checkoutRecord`, calculate:

```ts
const attendanceAction = resolveAttendanceAction(todayRecord, checkoutRecord);
```

Render Check In only for `check-in`, render the open record and Check Out for `check-out`, and render the existing work/leave/off status for `closed`. The displayed Check In time must come from `attendanceAction.record`, not blindly from `todayRecord`.

- [ ] **Step 9: Verify the complete attendance group**

Run:

```powershell
npm run test:run -- src/lib/attendanceRules.test.ts src/hooks/useAttendanceData.test.tsx
```

Expected: all tests pass, including overnight and leave-state regressions.

- [ ] **Step 10: Commit the shift fix**

```powershell
git add src/lib/attendanceRules.ts src/lib/attendanceRules.test.ts src/hooks/useAttendanceData.ts src/hooks/useAttendanceData.test.tsx src/pages/Dashboard.tsx
git commit -m "fix: handle closed and overnight attendance states"
```

### Task 4: Make Neon initialization recoverable

**Files:**
- Modify: `src/lib/neon.ts`
- Modify: `src/lib/neon.test.ts`
- Modify: `src/repositories/attendanceRepository.ts`
- Modify: `src/repositories/profileRepository.ts`
- Modify: `src/repositories/settingsRepository.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: repository and Auth mocks in affected tests

- [ ] **Step 1: Add a failing lazy-initialization test**

Test that importing `neon.ts` does not read configuration and that the first getter call does:

```ts
it('defers configuration validation until the client is requested', async () => {
  const module = await import('./neon');
  expect(getNeonConfig).not.toHaveBeenCalled();
  expect(() => module.getNeonClient()).toThrow('Cấu hình Neon không hợp lệ');
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm run test:run -- src/lib/neon.test.ts
```

Expected: import evaluates `getNeonConfig()` immediately or `getNeonClient` is missing.

- [ ] **Step 3: Replace the eager singleton with a lazy getter**

Implement:

```ts
type NeonClient = ReturnType<typeof createClient<Database>>;
let client: NeonClient | null = null;

export function getNeonClient(): NeonClient {
  if (client) return client;
  const config = getNeonConfig();
  client = createClient<Database>({
    auth: { adapter: SupabaseAuthAdapter(), url: config.authUrl },
    dataApi: { url: config.dataApiUrl },
  });
  return client;
}
```

Expose a test reset only through `vi.resetModules()`; do not add a production reset API.

- [ ] **Step 4: Update all client consumers**

Replace direct `neon` usage with a method-local client:

```ts
const neon = getNeonClient();
```

In `AuthProvider`, call the getter inside `try` blocks in `hydrateSession`, `login`, and `logout`. In the auth subscription effect, catch getter errors, set `initializationError`, set loading false, and return without subscribing.

- [ ] **Step 5: Update mocks and verify GREEN**

Mocks should export:

```ts
getNeonClient: vi.fn(() => sdk),
```

Run:

```powershell
npm run test:run -- src/lib/neon.test.ts src/contexts/AuthContext.test.tsx src/repositories/repositories.test.ts
```

Expected: all selected tests pass and importing the app with missing env no longer throws before React.

- [ ] **Step 6: Commit the lazy client**

```powershell
git add src/lib/neon.ts src/lib/neon.test.ts src/repositories src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx
git commit -m "fix: surface Neon configuration errors in React"
```

### Task 5: Make profile initialization concurrency-safe

**Files:**
- Modify: `src/repositories/profileRepository.ts`
- Modify: `src/repositories/repositories.test.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/AuthContext.test.tsx`

- [ ] **Step 1: Add a failing repository race test**

Mock the first select as empty, insert as a unique-conflict error, and the second select as the profile created by another caller:

```ts
await expect(profileRepository.ensure(identity, now)).resolves.toEqual(
  expect.objectContaining({ uid: 'u1', email: 'u1@example.com' }),
);
```

- [ ] **Step 2: Verify repository RED**

Run:

```powershell
npm run test:run -- src/repositories/repositories.test.ts
```

Expected: `ensure` rejects immediately on the insert error.

- [ ] **Step 3: Re-read after an insert collision**

Keep the initial select. If insert returns an error, perform one owner-scoped select; return it when present, otherwise throw the original localized insert error. Do not retry in a loop.

- [ ] **Step 4: Add a failing Auth deduplication test**

Fire an auth-state callback and resolve `signInWithPassword` for the same user before `profileRepository.ensure` resolves. Assert:

```ts
expect(profileRepository.ensure).toHaveBeenCalledTimes(1);
```

- [ ] **Step 5: Verify Auth RED**

Run:

```powershell
npm run test:run -- src/contexts/AuthContext.test.tsx
```

Expected: ensure is called twice, once by `login` and once by the subscription.

- [ ] **Step 6: Deduplicate in-flight profile requests**

Use a provider-local ref:

```ts
const profileRequests = useRef(new Map<string, Promise<UserProfile>>());

const ensureProfile = useCallback((identity: AuthUserIdentity) => {
  const existing = profileRequests.current.get(identity.id);
  if (existing) return existing;
  const request = profileRepository.ensure(identity).finally(() => {
    if (profileRequests.current.get(identity.id) === request) {
      profileRequests.current.delete(identity.id);
    }
  });
  profileRequests.current.set(identity.id, request);
  return request;
}, []);
```

Use `ensureProfile` in hydrate, login, and auth-state callback.

- [ ] **Step 7: Verify and commit concurrency handling**

Run:

```powershell
npm run test:run -- src/repositories/repositories.test.ts src/contexts/AuthContext.test.tsx
```

Expected: race recovery and same-provider deduplication tests pass.

```powershell
git add src/repositories/profileRepository.ts src/repositories/repositories.test.ts src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx
git commit -m "fix: serialize profile initialization"
```

### Task 6: Fix mobile logout, history search, and Settings save state

**Files:**
- Create: `src/lib/attendanceFilters.ts`
- Create: `src/lib/attendanceFilters.test.ts`
- Modify: `src/pages/History.tsx`
- Modify: `src/hooks/useSettingsData.ts`
- Modify: `src/hooks/useSettingsData.test.tsx`
- Modify: `src/pages/Settings.tsx`
- Create: `src/pages/Settings.test.tsx`
- Modify: `src/components/Layout.tsx`
- Create: `src/components/Layout.test.tsx`

- [ ] **Step 1: Add a failing search predicate test**

```ts
it('does not match a missing note when a keyword is present', () => {
  expect(matchesAttendanceSearch({ ...record, note: undefined }, 'meeting')).toBe(false);
});

it('matches every note when the keyword is empty', () => {
  expect(matchesAttendanceSearch({ ...record, note: undefined }, '')).toBe(true);
});
```

- [ ] **Step 2: Verify search RED, then implement the predicate**

Run the test and expect a missing-module failure, then create:

```ts
export function matchesAttendanceSearch(
  record: AttendanceRecord,
  searchTerm: string,
): boolean {
  return (record.note ?? '').toLowerCase().includes(searchTerm.trim().toLowerCase());
}
```

Use it in `History.tsx`.

- [ ] **Step 3: Add failing Settings hook tests**

During a deferred update request, assert `saving` becomes true; after resolution or rejection, assert it becomes false. On rejection, assert the refetched server settings replace hook state.

- [ ] **Step 4: Verify Settings RED, then add save state**

Implement:

```ts
const [saving, setSaving] = useState(false);
```

Set it true before update and false in `finally`; return it from the hook. Pass it to `SettingsContent` instead of `saving={false}`. In `SettingsContent`, synchronize all four local form fields whenever the `settings` object changes:

```ts
useEffect(() => {
  setSalaryType(settings.salaryType);
  setSalaryAmount(settings.salaryAmount);
  setWorkHoursPerDay(settings.workHoursPerDay);
  setThemePreference(settings.theme);
}, [settings]);
```

This preserves unsaved edits while the server object is unchanged and restores authoritative values after a failed update refetch.

- [ ] **Step 5: Add failing logout UI tests**

Render `Settings` with a mobile logout control and verify clicking it calls `logout`; render `Layout` with a rejected logout and verify an error toast is emitted rather than only `console.error`.

- [ ] **Step 6: Implement visible logout handling**

In Settings, add an `md:hidden` account action using `logout()` and `navigate('/login')` only after success. In Layout, replace the console-only catch with:

```ts
toast.error(error instanceof Error ? error.message : 'Không thể đăng xuất.');
```

- [ ] **Step 7: Verify and commit the UI reliability group**

Run:

```powershell
npm run test:run -- src/lib/attendanceFilters.test.ts src/hooks/useSettingsData.test.tsx src/pages/Settings.test.tsx src/components/Layout.test.tsx
```

Expected: search, saving state, mobile logout, and logout error tests pass.

```powershell
git add src/lib/attendanceFilters.ts src/lib/attendanceFilters.test.ts src/pages/History.tsx src/hooks/useSettingsData.ts src/hooks/useSettingsData.test.tsx src/pages/Settings.tsx src/pages/Settings.test.tsx src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "fix: restore mobile and settings interactions"
```

### Task 7: Enforce new-write integrity and remove Firebase tooling

**Files:**
- Modify: `src/lib/dataValidation.ts`
- Modify: `src/lib/dataValidation.test.ts`
- Modify: `scripts/migrations/001_initial_schema.sql`
- Modify: `src/test/migrationContract.test.ts`
- Modify: `package.json`
- Delete: `vitest.rules.config.ts`
- Delete: `test/firestore.rules.test.ts`

- [ ] **Step 1: Add failing validation cases**

Add tests rejecting:

```ts
parseAttendanceRecord({ ...validRecord, date: '2026-02-31' });
parseAttendanceRecord({ ...validRecord, checkOut: undefined, totalHours: 8 });
parseAttendanceRecord({ ...validRecord, checkOut: '17:00', totalHours: 7 });
parseUserSettings({ ...validSettings, workHoursPerDay: 25 });
```

The attendance total-hours test must expect the value calculated from check-in/out, preventing salary from trusting a contradictory stored total.

- [ ] **Step 2: Verify validation RED**

Run:

```powershell
npm run test:run -- src/lib/dataValidation.test.ts
```

Expected: invalid calendar dates and contradictory attendance fields are currently accepted.

- [ ] **Step 3: Strengthen the schemas**

Add a calendar-date refinement, require `totalHours` if and only if checkout exists for work records, reject time fields for non-work records, and compare the supplied total with `calculateTotalHours` using a 0.01-hour tolerance.

- [ ] **Step 4: Add failing migration/tooling contract tests**

Assert migration SQL contains named `NOT VALID` constraints for date, time, total hours, status consistency, positive salary, and 1–24 target hours. Assert `package.json` has no `test:rules` or `deploy:rules`, and the two Firebase-only files do not exist.

- [ ] **Step 5: Verify contract RED**

Run:

```powershell
npm run test:run -- src/test/migrationContract.test.ts
```

Expected: the new constraint names are absent and legacy package scripts still exist.

- [ ] **Step 6: Add idempotent PostgreSQL constraints**

Use `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` followed by named `ADD CONSTRAINT ... NOT VALID` clauses. Enforce:

```sql
CHECK (date ~ '^\d{4}-\d{2}-\d{2}$' AND date::date::text = date) NOT VALID
CHECK (check_in = '' OR check_in ~ '^(?:[01]\d|2[0-3]):[0-5]\d$') NOT VALID
CHECK (check_out IS NULL OR check_out ~ '^(?:[01]\d|2[0-3]):[0-5]\d$') NOT VALID
CHECK (total_hours IS NULL OR (total_hours > 0 AND total_hours <= 24)) NOT VALID
CHECK (
  (status = 'work' AND check_in <> '' AND
    ((check_out IS NULL AND total_hours IS NULL) OR
     (check_out IS NOT NULL AND total_hours IS NOT NULL)))
  OR
  (status IN ('leave', 'off') AND check_in = '' AND check_out IS NULL AND total_hours IS NULL)
) NOT VALID
```

Replace settings checks with salary `> 0` and work hours `BETWEEN 1 AND 24`, both `NOT VALID`.

- [ ] **Step 7: Remove Firebase-only tooling**

Delete `test:rules` and `deploy:rules` from `package.json`, then delete `vitest.rules.config.ts` and `test/firestore.rules.test.ts`. Do not alter historical planning documents.

- [ ] **Step 8: Verify and commit integrity cleanup**

Run:

```powershell
npm run test:run -- src/lib/dataValidation.test.ts src/test/migrationContract.test.ts
```

Expected: validation and migration/tooling contract tests pass.

```powershell
git add src/lib/dataValidation.ts src/lib/dataValidation.test.ts scripts/migrations/001_initial_schema.sql src/test/migrationContract.test.ts package.json vitest.rules.config.ts test/firestore.rules.test.ts
git commit -m "fix: enforce timekeeping data integrity"
```

### Task 8: Final verification and browser smoke test

**Files:**
- Verify: all changed production and test files

- [ ] **Step 1: Run the complete automated gate**

```powershell
npm run test:run
npm run test:coverage
npm run lint
npm run build
git diff --check
git status --short
```

Expected: all tests pass, coverage is no lower than the pre-fix 65.74% statements and 59.19% branches, lint/build exit 0, diff check is clean, and worktree status is empty after commits.

- [ ] **Step 2: Verify missing configuration in the browser**

Start Vite without `.env`, open the app, and verify the DOM contains an alert titled `Không thể khởi tạo ứng dụng` with a `Thử lại` button. Confirm `#root` is not empty.

- [ ] **Step 3: Verify unreachable-backend handling**

Start Vite with syntactically valid `.invalid` Auth and Data API endpoints. Verify the app renders the same recoverable initialization error after fetch failure and does not expose an unhandled blank page.

- [ ] **Step 4: Audit remaining known risks**

Run:

```powershell
npm audit --json
```

Record the upstream Neon Auth beta advisory count without applying `npm audit fix --force`. Record the Vite chunk-size warning as an out-of-scope performance item.
