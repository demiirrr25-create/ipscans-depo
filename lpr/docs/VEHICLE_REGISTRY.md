# Vehicle and resident registry

`Registry(operations)` adds `blocks`, `units`, `residents`, `vehicles` and
`vehicle_owners` to the existing SQLite database. Startup copies existing grants
once into vehicle records without changing grants, users, cameras or passages.
No person, phone, block or unit is inferred from a plate or an old grant.
Deleting a migrated vehicle does not recreate it on restart. Existing grant
restrictions still apply if the same plate is registered again.

`RegistryWidget(operations, session, parent=None)` is an embeddable Qt Vehicles
page with vehicle, resident and location tabs. Its `changed` signal lets the
Dashboard refresh current registry associations. `create_vehicle(plate='')`
supports registration from an unknown passage. `refresh()` reloads the page.

## Data and permissions

- Plates use the existing conservative ordinary Turkish civil plate validator.
  Whitespace and hyphens normalize; characters are never guessed or repaired.
  The normalized plate is unique.
- Residents have stable IDs. A vehicle may have up to 32 owners, and each resident
  may own multiple vehicles. Blocks and units are separate models. Foreign keys
  prevent deletion of occupied units and nonempty blocks. Removing a resident
  deletes ownership links, preserving vehicles and event history.
- Admins manage records and see optional phone numbers and notes. Operators see
  owner names and unit associations required for operations, but no phone/notes.
  Auditors may export this restricted view. Every API checks the live session.
- Audit rows record operation names and record IDs/counts, not personal fields.
- `lookup(session, plate)` returns the exact stored vehicle with `owners`, or
  `None`. It never fills unknown owner information. `access` describes current
  direction/validity/status restrictions and always has `barrier_command=False`.
  Existing grants additionally restrict dates, directions, blocks and remaining
  use counts. This registry does not control hardware or consume grant uses.
- Temporary permissions require start/end dates. Unknown, inactive and blocked
  statuses deny both directions even if permission checkboxes are selected.
- `page()` supports literal text, status, block, unit and last-passage dates, with
  a bounded page size. Last-passage timestamps come from real stored passages.

## CSV / Excel

The UI saves an empty CSV template and supports UTF-8 CSV and `.xlsx` import and
export. Columns are:

`plate,status,make,model,color,vehicle_type,entry_allowed,exit_allowed,valid_from,valid_until,notes,owners`

Only `plate` is required. Permissions use `0` or `1`; an omitted permission is
false. Status values are `registered`, `unknown`, `visitor`, `staff`, `temporary`,
`blocked`, `inactive`. Vehicle types are `car`, `motorcycle`, `bus`, `truck`, `other`.
Dates use ISO 8601 with an explicit time zone, such as `2026-10-15T18:00:00+03:00`.

`owners` is a JSON list. Example below describes input format only; no example
records are installed or displayed in the product:

```json
[{"first_name":"Ad","last_name":"Soyad","block":"A","unit":"24"}]
```

Each owner without `id` creates a new resident. The importer deliberately does
not merge names or addresses into a person identity. To link an existing person,
use `[{"id":42}]` with the actual resident ID. If both ID and personal fields are
provided, they must match the existing resident. Exports include IDs for safe
reimport into the same database. Cross-database imports should remove IDs.

Duplicate plates, invalid rows, unknown resident IDs or invalid date ranges roll
back the **entire import**, including newly created residents, units and audit
rows. Imports create new records; they never overwrite an existing vehicle.
Limit: 5,000 vehicles and a 10 MB input file per import. XLSX readers reject
formulas, external links, XML entities and oversized expanded content; only the
first worksheet is imported.

Exports apply the current search/filter and produce up to 100,000 rows. CSV cells
with spreadsheet formula prefixes receive an apostrophe for safe viewing. That
apostrophe remains if such a CSV is reimported; XLSX preserves the exact string
without executable formulas and is preferred for a faithful round trip.
Files are written atomically and temporary files are removed after failures.

## Validation

Tests cover additive old-database migration and restart, multiple ownership,
normalized duplicate rejection, transactional edits/import rollback, permissions,
phone/notes redaction, exact lookup, expiry, legacy restriction preservation,
CSV/XLSX handling and real Qt forms saving/querying SQLite data. These are local
software tests, not camera field accuracy or multi-station concurrency tests.

Remaining constraints: the registry uses the existing single-station SQLite
storage and Windows account/file permissions; it does not encrypt all personal
data at rest. Current associations are looked up from the registry; event-time
snapshots and deletion retention for any separate event snapshots are owned by
the event module. Legal retention policy remains an installation decision.
