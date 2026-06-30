# Advanced Personal Timekeeping PWA Design

## Goal

Evolve Work Log into an installable personal timekeeping PWA that remains usable offline, synchronizes reliably across devices, provides daily/weekly/monthly goal analysis, and reminds the user to check in or out.

## Product Scope

This design keeps the product focused on one person's attendance data. Team administration, approval workflows, payroll compliance, project billing, CSV/Excel/PDF reporting, and automatic schedule changes are outside this scope.

The selected delivery strategy is foundation-first:

1. Stabilize authentication and Neon persistence.
2. Add PWA installation, offline storage, synchronization, and JSON backup/restore.
3. Add work goals, reports, and trends.
4. Add fixed reminders, Web Push, and missed-attendance detection.
5. Add schedule suggestions derived from attendance history.

Each phase must result in usable, independently verified software before the next phase begins.

## Architecture

React remains the presentation layer. IndexedDB becomes the device-local source used for immediate reads and writes. Neon Postgres remains the synchronized server-side source and cross-device backup. A repository boundary hides whether data currently comes from IndexedDB or Neon so pages and hooks do not issue SQL directly.

Every attendance mutation is validated and committed to IndexedDB first. The UI updates immediately and the mutation is added to a persistent synchronization queue. A sync service submits queued mutations when connectivity and authentication are available, applies the server result locally, and retries transient failures with bounded exponential backoff.

A service worker caches the application shell and static assets so the application can launch without a network connection. A small trusted backend owns Web Push credentials, stores subscriptions, evaluates reminder schedules, and dispatches notifications. Secrets, database credentials, and VAPID private keys must never be shipped to the browser.

## Authentication and Foundation Work

Feature work begins only after the current Neon migration is made operational:

- Replace placeholder Neon URLs and credentials with valid environment configuration.
- Implement the actual Neon Auth session contract rather than assuming a response token shape.
- Keep login errors inside the login form; they must not replace the application with a global initialization error.
- Create first-login profiles with every schema-required field.
- Move direct SQL access behind typed repositories and validate all server responses.
- Propagate persistence failures so forms and modals do not report success or close after a failed save or delete.
- Add integration coverage for authentication, migrations, RLS, and repository operations.

## Data Model

### Attendance records

Existing attendance records gain synchronization metadata:

- `version`: monotonically increasing server version.
- `server_updated_at`: authoritative server timestamp used for conflict resolution.
- `sync_status`: local-only state of `synced`, `pending`, or `failed`.
- `deleted_at`: nullable soft-delete timestamp so offline deletes can synchronize.

The existing one-record-per-user-per-date constraint remains authoritative.

### Work goals

`work_goals` stores the user's working weekdays and target hours per working day. Weekly and monthly targets are derived from the applicable working days rather than maintained as independent values that can drift.

Leave and unpaid-off days are reported separately and are excluded from missing-hours warnings. A work day compares completed hours with its daily target. Week and month summaries aggregate actual hours, target hours, missing or excess hours, and completion percentage.

### Reminder schedules

`reminder_schedules` stores enabled check-in and check-out times per weekday, the user's IANA time zone, and reminder enablement. Fixed schedules are always controlled by the user.

History-based suggestions use recent attendance to propose adjusted times. Suggestions never modify a schedule automatically; the user must explicitly accept them.

### Push subscriptions

`push_subscriptions` stores Web Push endpoints and keys per authenticated user and device. The user can revoke any device. Expired or rejected subscriptions are disabled by the backend.

### Local synchronization queue

IndexedDB stores durable create, update, and delete mutations with an operation ID, entity ID, base version, local timestamp, retry count, and last error category. Queue entries survive browser restarts.

## Offline and Synchronization Behavior

- Attendance creation, editing, and deletion work without a network connection.
- Local commits update the UI immediately and show a visible `pending` state.
- Synchronization starts after sign-in, when connectivity returns, and on an explicit retry action.
- Transient network and server errors are retried with bounded backoff.
- Authentication, authorization, validation, and schema errors stop automatic retries and remain visible for user action.
- Deletes use tombstones until the server acknowledges them.
- The server assigns authoritative timestamps and versions.
- Conflicts use last-write-wins based on the authoritative server update time. A stale client cannot manufacture a later server time.
- After resolution, the winning server record replaces the local copy and the UI explains that a newer update from another device was applied.

The interface distinguishes `saved on this device` from `synchronized to server`; it never calls a pending mutation fully synchronized.

## JSON Backup and Restore

The first export format is JSON only. A backup contains:

- `schemaVersion` and export timestamp.
- User profile and non-secret settings.
- Attendance records.
- Work goals and reminder schedules.

Authentication tokens, database credentials, local queue internals, push subscriptions, and private keys are excluded.

Restore parses and validates the entire file before writing anything. A preview reports records that will be inserted, updated, or skipped. The user must confirm the preview. Restore uses one atomic local transaction, then queues accepted changes for server synchronization. An unsupported or invalid backup leaves existing data unchanged.

## User Experience

### Dashboard

The dashboard shows today's attendance state, the daily goal, weekly and monthly progress, 7/30/90-day trends, missing-hours or missed-checkout warnings, and the current synchronization state. Check-in and check-out remain the primary actions.

### History

Each record shows its synchronization status. Filters cover date range and attendance status. Editing and deletion work offline. Forms stay open with the user's values intact when a local validation or persistence operation fails.

### Goals and analytics

The user configures working weekdays and daily target hours. Reports compare actual versus target hours for the selected day, week, and month, including missing or excess hours and completion percentage. Leave and unpaid-off days remain visible but do not count as unexplained missing hours.

### Reminders

The user configures check-in and check-out times for each weekday and enables notifications per device. The backend can notify for a missing check-in, missing check-out, or an abnormally long open shift. History-based suggestions are presented separately and require approval.

### Data management

Settings displays installation and notification state, last successful synchronization, pending operation count, last backup time, JSON export, restore preview, and per-device push revocation.

## Error Handling

- Login failures remain recoverable within the login form.
- A local persistence failure prevents optimistic success and keeps the editor open.
- A server synchronization failure retains the local mutation and exposes retry details without losing data.
- User-facing errors distinguish offline, authentication, authorization, validation, and server failures.
- Retryable failures use bounded backoff; non-retryable failures require user action.
- Restore and migration operations are all-or-nothing.
- Global initialization errors are reserved for failures that genuinely prevent the local application from starting.

## Security and Privacy

- Neon RLS restricts every server-side table to the authenticated user.
- The backend validates ownership independently of client-provided user IDs.
- Tokens are not included in backups or logs.
- VAPID private keys and database credentials remain server-side.
- Notification permission is requested only after the user enables reminders.
- Push subscriptions can be revoked individually.
- Backup restore requires a validated preview and explicit confirmation.

## Testing Strategy

### Unit tests

Cover attendance validation, daily/weekly/monthly target calculations, leave-day exclusions, trend calculations, missed-check-in/out detection, reminder suggestions, backup validation, and last-write-wins conflict resolution.

### Integration tests

Cover Neon Auth sessions, profile creation, migrations, RLS isolation, typed repositories, IndexedDB transactions, persistent queue restart behavior, retry classification, and JSON restore atomicity.

### Component tests

Cover login error recovery, synchronization badges, offline banners, failed-save modal behavior, goal displays, reminder settings, backup preview, and invalid backup rejection.

### PWA and end-to-end tests

Cover installability, service-worker cache behavior, application launch offline, offline attendance followed by online synchronization, two-device conflict resolution, backup and restore, push subscription lifecycle, and reminder delivery. Each phase must pass unit and integration tests, lint, production build, and PWA checks before completion.

## Acceptance Criteria

- A configured production environment can authenticate and persist a first-time user without manual database repair.
- The installed PWA launches and allows attendance create, edit, and delete while offline.
- Pending changes survive a restart and synchronize after connectivity returns.
- Cross-device conflicts resolve using authoritative server time, with the winning value shown locally.
- The user can export a versioned JSON backup and preview and restore a valid backup without partial writes.
- The dashboard accurately reports daily, weekly, and monthly goals and 7/30/90-day trends.
- Leave and unpaid-off days do not produce false missing-hours warnings.
- Fixed Web Push reminders work when the app is not open, subject to platform notification support and permission.
- Missed check-in/out detection uses the configured schedule and current attendance state.
- Schedule suggestions never take effect without explicit user confirmation.
- No failed save, delete, login, restore, or synchronization operation is presented as successful.

## Deferred Work

CSV, Excel, and PDF exports; project-based goals; team management; approval workflows; payroll compliance; and fully automatic schedule changes are deferred until the scoped PWA is stable.
