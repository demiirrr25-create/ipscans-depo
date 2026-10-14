# Vehicle passage history

The passage tab now supports combined partial plate, camera, direction, vehicle type, evidence status, confidence range and optional UTC date/time filters. The start is inclusive; the end is exclusive. These filters query actual vehicle passage records, separately from plate sightings and operator-confirmed parking entries.

The view loads at most 100 rows per page. Navigation uses the `(at,event_id)` ordering key instead of progressively large SQL offsets. A persistent ingestion sequence excludes later insertions from an existing page session, including when old records have been removed by retention. Retention may remove rows from older pages; it cannot make new rows appear in an old snapshot. Latest resets navigation and takes a fresh snapshot. Background refresh only affects the first page and is throttled to two seconds.

The database migration backfills sequence identities for existing passages, and subsequent insertions allocate their identity in the same transaction as the passage and audit record. All filter values are bound SQL parameters. Invalid date/confidence ranges are rejected. Authentication is checked for each page load and refresh; expired sessions clear the view.

Validation: automated tests cover combined filters, exclusive date endpoint, injection-like camera input, invalid inputs, equal timestamps, insertions during pagination, deletion followed by insertion, UI navigation, filter/reset behavior and session expiry. The full suite passed 83 tests on 2026-10-14 before the equivalent EXISTS query optimization; the focused query/UI suite was rerun afterward. A rendered Qt screenshot was inspected using synthetic unread events; it is not real camera evidence.

CSV/XLSX/PDF passage report exports, aggregate statistics and production-scale performance measurements remain pending. The existing separate observation CSV export remains available.
