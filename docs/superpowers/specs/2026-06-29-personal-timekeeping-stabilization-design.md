# Personal Timekeeping Stabilization Design

## Goal

Stabilize the personal timekeeping application by fixing the confirmed authentication, Firebase, attendance, settings, error-handling, code-quality, and initial-load performance defects without adding enterprise roles or approval workflows.

## Product Scope

The application is for one individual account at a time. Firebase accounts are provisioned outside the application. The UI supports sign-in and sign-out only; self-registration, administration, HR roles, employee management, and approval workflows are out of scope.

Demo Mode remains available only when Firebase configuration is intentionally absent. A Firebase initialization or connectivity failure in a configured deployment must fail closed, show a recoverable error screen, and block data mutations instead of silently switching storage backends.

## Architecture

- Keep the existing React, TypeScript, Firebase, and localStorage stack.
- Preserve the current pages and navigation while extracting business rules into small pure modules that can be tested without React or Firebase.
- Represent authentication and data loading explicitly as loading, ready, and error states. Components render a retryable error state instead of treating failed reads as empty datasets.
- Keep Firestore and Demo Mode behind the existing data-access boundary. Both implementations must apply the same validation rules and propagate failures to callers.
- Lazy-load route pages and isolate the chart-heavy statistics page so Recharts is not part of the initial login/dashboard bundle.

## Authentication and Firebase Behavior

- Remove registration state, controls, validation, and `registerUser` from the public auth API.
- Login accepts only an existing Firebase email/password account. Demo credentials remain accepted only in intentional Demo Mode.
- Firebase configuration is validated before services are exposed. A configured project that fails initialization exposes a typed configuration error; it does not claim to be in Demo Mode.
- Auth initialization exposes a terminal error when the session listener cannot initialize. A timeout must not produce a temporary unauthenticated redirect followed by a late authenticated redirect.
- Ignore stale asynchronous profile results after auth state changes or provider unmounts.
- Logout failures remain visible to the user and do not falsely report a successful logout.
- A profile read failure may use the authenticated Firebase identity for display, but it must preserve an explicit profile-sync warning rather than hiding the failure.

## Attendance Rules

- Each user has at most one record per work-date. The Firestore document identifier remains `{userId}_{YYYY-MM-DD}`.
- Check-in creates a `work` record for the current local date only when no record already exists.
- Checkout first targets today's incomplete work record. If none exists, it targets the most recent earlier incomplete work record, allowing a shift that crosses midnight to be completed.
- A completed shift must have valid `HH:mm` values and a duration greater than zero and no more than 24 hours. Equal check-in and checkout values are rejected rather than interpreted as a 24-hour shift.
- Manual records reject future dates, invalid calendar dates, invalid time strings, unsupported statuses, non-finite totals, and inconsistent status/time fields.
- `leave` and `off` records contain no check-in, checkout, or total hours.
- Streaks count completed `work` records only and skip weekends without extending the count.
- Average hours per day divides total completed hours by completed work shifts only.
- Daily salary uses completed work days; hourly salary uses validated completed hours. Leave remains unpaid until a separate paid-leave feature is designed.
- `workHoursPerDay` determines whether a completed day is below, meets, or exceeds the user's target. It does not apply an overtime multiplier.

## Data Access and Error Handling

- Data-access functions validate serialized localStorage values and Firestore documents before returning them.
- Corrupt Demo Mode storage produces a recoverable error with an explicit reset option; it does not crash during `JSON.parse`.
- Attendance and settings reads propagate network, permission, timeout, and validation failures.
- Default settings are created only after a successful read proves that the settings document does not exist. Connectivity failures never return defaults.
- Save and delete functions reject on failure. UI dialogs remain open, preserve entered values, and allow retry.
- Attendance pages distinguish loading, empty, and error states and expose retry controls.
- Concurrent actions are disabled while a mutation is pending. Firestore document IDs continue to prevent duplicate records, and the latest server result is reloaded after successful mutations.

## Firestore Security Rules

- Replace unsupported string methods with supported rule expressions.
- Reads require `resource.data.userId == request.auth.uid`, matching the application's `where('userId', '==', uid)` query.
- Creates and updates require both an exact document ID derived from authenticated UID plus date and `request.resource.data.userId == request.auth.uid`.
- Updates cannot transfer ownership or change the record date independently of the document ID.
- Rules validate allowed keys, date/time string shapes, attendance status, timestamps, and status-specific field consistency.
- User profiles and settings remain owner-only and receive basic key/type/range validation.

## UI and Performance

- Replace registration messaging with a clear statement that the user must sign in with an existing account.
- Add reusable error panels for Firebase initialization, attendance load, settings load, and profile-sync warnings.
- Keep modals open after failed save/delete operations and show the returned error once.
- Remove duplicate success toasts from page and hook layers so each action reports once.
- Compute render-time dates from stable values rather than calling impure time functions inside JSX.
- Lazy-load protected pages. Keep Recharts and statistics-only code in the statistics route chunk.
- Resolve all existing ESLint errors through typing and component/hook structure changes; do not disable rules globally.

## Testing

- Add Vitest, React Testing Library, jsdom, Firebase Rules Unit Testing, and Firebase Emulator tooling.
- Unit tests cover strict date/time validation, zero/equal time rejection, overnight duration, maximum duration, completed-shift selection, streak weekends, incomplete shifts, average hours, salary, and target-hour classification.
- Auth tests cover existing-account login, absent registration API/UI, Firebase initialization failure, auth timeout, stale profile completion, and logout failure.
- Hook and component tests cover read errors, retry, corrupt Demo storage, settings-not-found creation, network-error preservation, save/delete failure, and modal retention.
- Rules tests prove owner access, cross-user denial, query compatibility, malformed-document denial, ownership immutability, and settings/profile isolation.
- Browser verification covers login error rendering, protected-route behavior, attendance load failure, retry, manual record validation, overnight checkout presentation, and responsive layouts without touching production Firebase data.

## Acceptance Criteria

- `npm test` passes with no failed tests.
- Firestore Rules emulator tests pass without production deployment.
- `npm run lint` reports zero errors and warnings.
- `npm run build` succeeds, and the initial route bundle no longer includes the statistics chart code.
- Registration is absent from the UI and auth context.
- Configured Firebase failures block mutations and never switch to Demo Mode.
- Cross-midnight checkout completes the most recent open shift correctly.
- Failed loads, saves, and deletes remain visible and retryable without presenting false empty or success states.
- No production Firebase documents are created, modified, or deleted during verification.

## Migration and Compatibility

- Existing valid attendance and settings documents remain readable.
- Invalid legacy documents are reported as validation errors rather than silently coerced.
- Existing Demo Mode keys remain unchanged; corrupt keys require explicit user reset.
- Security Rules changes must be validated in the emulator before the user deploys them separately.
