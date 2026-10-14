# Vehicle passage history

The passage tab now supports combined partial plate, camera, direction, vehicle type, evidence status, confidence range and optional UTC date/time filters. The start is inclusive; the end is exclusive. These filters query actual vehicle passage records, separately from plate sightings and operator-confirmed parking entries.

The view loads at most 100 rows per page. Navigation uses the `(at,event_id)` ordering key instead of progressively large SQL offsets. A persistent ingestion sequence excludes later insertions from an existing page session, including when old records have been removed by retention. Retention may remove rows from older pages; it cannot make new rows appear in an old snapshot. Latest resets navigation and takes a fresh snapshot. Background refresh only affects the first page and is throttled to two seconds.

The database migration backfills sequence identities for existing passages, and subsequent insertions allocate their identity in the same transaction as the passage and audit record. All filter values are bound SQL parameters. Invalid date/confidence ranges are rejected. Authentication is checked for each page load and refresh; expired sessions clear the view.

Validation: automated tests cover combined filters, exclusive date endpoint, injection-like camera input, invalid inputs, equal timestamps, insertions during pagination, deletion followed by insertion, UI navigation, filter/reset behavior and session expiry. The full suite passed 83 tests on 2026-10-14 before the equivalent EXISTS query optimization; the focused query/UI suite was rerun afterward. A rendered Qt screenshot was inspected using synthetic unread events; it is not real camera evidence.

## Reports and CSV export

The applied filter now drives a report dialog with daily UTC, hourly UTC and camera groups. Each group contains total passages, entries, exits, recognized plates, review decisions and unread passages. Queries share a database read snapshot. The displayed recognized proportion describes stored model decisions, not ground-truth OCR accuracy. Empty results display no percentage. Report access is audited.

CSV export includes all matching passage rows rather than only the visible page, reads 500 rows at a time, emits explicit UTC timestamps and neutralizes spreadsheet formula prefixes in untrusted text. Export permission is checked before writing, on each batch and before publication. Output is written and flushed to a temporary sibling file before atomic replacement. Exceeding 100,000 rows raises an error without replacing the destination; the operator must narrow the date range. Export attempts, completion and failure are audited without recording the output path or plate text in the audit detail.

The full suite now passes **93 tests**, including a 503-record multi-page export, combined aggregate counts, authorization denial, formula input protection, and preservation of existing output after an export limit failure. The report dialog was rendered and visually inspected with synthetic unread events.

## XLSX and PDF

The export selector now offers CSV passage rows, XLSX passage rows with a formula-based summary, and a PDF aggregate report. XLSX contains a Report sheet and a Passages sheet, frozen headers, filters, typed UTC dates, numeric confidence percentages and explicit text cells for camera/line/plate values. Formula and URL auto-detection are disabled. Summary counts have cached values and COUNTIF/COUNTA formulas referencing the exported detail range. Applied filters are included in human-readable form.

XLSX uses XlsxWriter 3.2.9 in constant-memory mode. Its BSD-2-Clause notice is retained under third-party-notices/XlsxWriter and the dependency is pinned for desktop builds. PDF uses the existing Qt runtime, with explicit page layout, repeated section headings and page numbers. PDF is an aggregate report; individual passages remain available through CSV/XLSX. Both new formats use checked permissions, audit entries, temporary files and atomic replacement. Temporary XLSX assembly files are confined to an isolated directory that is removed after completion/failure.

Validation: the full suite passed 96 tests before the final PDF pagination repair; the 14-test export/report suite passed after that repair, including a new three-page PDF load/text test. A 40-event synthetic export was rendered: both workbook sheets and all PDF pages were inspected. An initial Qt painter clipping issue on later pages was found visually and fixed by isolating painter state per document. Artifact Tool recalculation returned 40 total, 20 entries and 20 exits; editing one direction in a disposable in-memory copy changed the totals to 21 and 19. Native Microsoft Excel execution has not been tested. These files contain synthetic QA data, not field recognition evidence.

Camera downtime reports, production-scale performance measurements and frozen executable verification of these new formats remain pending. The existing separate observation CSV export remains available.
