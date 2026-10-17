# Automatic record retention

An administrator can select 1–3650 days and explicitly enable hourly automatic cleanup in Settings. Saving the policy applies it immediately after the existing confirmation dialog. Earlier installations that only stored a manual retention period do not silently opt in. The selected setting and every cleanup are audited.

After sign-in, the application checks the saved policy at startup and every minute. A persisted last-run timestamp limits actual cleanup to once per hour. Cleanup continues while the application is locked, since authority comes from the administrator's saved policy rather than the current login session. It does not run while the application is closed; this is not a Windows background service.

Cleanup removes expired plate observations and their correction rows, vehicle passages and their pagination sequence rows, and closed parking visits with their idempotency receipts. Expiry uses strict UTC `record_time < now - days*86400`; closed parking visits use exit time. Open visits remain intact so parking occupancy is not silently reset. Camera settings, credentials, users, grants, and audit records are not removed by this policy. Audit retention and exported/backup files require separate lifecycle handling.

All record deletion and last-run updates share one SQLite transaction. A failure rolls back earlier deletes. Invalid stored policy values prevent automatic deletion and are reported in the UI. A backwards clock delays the next scheduled run. Reopening the application retains the configured interval and opt-in state.

Validation: 102 tests passed, including explicit opt-in, operation without a live user session, interval gating, preservation of open parking visits, foreign-key integrity, invalid configuration rejection and transaction rollback after an injected delete failure. The source application also passed its synthetic UI/CSV/XLSX/PDF package check. No real user records were deleted during these tests.

This change is a source checkpoint after the published local dev3 build; the previously exported dev3 installer does not include it yet. It is not a claim of complete privacy-law compliance.
