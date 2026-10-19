# Driver Warnings (#13)

`public.driver_warnings` groups reports by target type, target ID and reported
status, with a count and latest report date. Only FREE, PAID and NO_PARKING
reports newer than 90 days are included. This is a regular view: expiry is
computed at read time, without a refresh job. The existing target index bounds
each feature's lookup. Reports never establish Parking Rules or Coverage.

Both legacy parking endpoints and rule-backed places read this view. Places
use the existing report kinds: curb → STREET, meter → METER, lot/zone → ZONE,
with the place's UUID. Warnings describe recent reports as of the request,
even when the driver selects another parking time. They pass to the evaluator
only as `driverWarnings`, independently of its classification.

The view owner reads the report columns; `app_rw` gets SELECT on aggregate
output only. This does not grant access to report emails, location, reason or
notes. Existing deduplication permissions and report validation remain intact.
Private-field retention continues to clear private fields without deleting
reports; it does not affect warning counts or dates.

## Staged rollout

Production and shared databases are unchanged by this PR. The current `main`
still reads `report_counts`, including classification overrides. Therefore
dropping those columns, or freezing counts for that code, is not a safe
migration-before-release step. All integrated migrations stay immutable.

1. Review and integrate `1792021300000_driver_warnings.sql`. Apply the additive
   migration to an explicitly approved target using [DATA.md](DATA.md). Verify
   the view and app-role reads before deploying this reader. The old app and
   count trigger continue to work. No private-field grant is required.
2. Ship and verify the fail-safe app and warning reader. Confirm **every active
   deployment and rollback candidate** ignores report counts for classification.
   Obtain separate human approval naming environment, snapshot, reviewed SQL
   and expected lock/runtime scope. Only then run
   [retire_report_count_trigger.sql](../sql/operations/retire_report_count_trigger.sql)
   in an owner session with `SET parking.retire_report_counts = 'approved'`.
   It removes the trigger/function and its parking-column UPDATE grants, retaining
   count columns and all rows. Verify report submission and warning reads under
   `app_rw`, with no parking-table writes. This is the no-write acceptance gate.
3. Keep columns for rollback compatibility until **no active or rollback reader**
   selects them. Search all app, script and test consumers and capture that
   evidence on #13. With a separately approved target and snapshot, run
   [drop_report_count_columns.sql](../sql/operations/drop_report_count_columns.sql)
   with `SET parking.drop_report_count_columns = 'approved'`. RESTRICT stops
   unexpected database dependencies. It intentionally removes only obsolete
   aggregate values, preserving reports and parking rows. The inert non-login
   role remains because prior migrations refer to it.

These manual operations are outside `sql/migrations`: `db:migrate` cannot
accidentally retire old-code compatibility before the deployment gates. Record
each execution and its checks on #13. Do not mark production acceptance complete
from a push, local replay or deployment alone. Rollback after stage 2 must use
fail-safe code; after stage 3 it must also avoid selecting count columns. Restore
neither old inference behavior nor old private values.

## Isolated validation

`tests/driver-warnings-db.test.mjs` requires a newly created empty database named
`driver_warnings_test` (optional numeric suffix) on a verified disposable branch.
Privately set `WARNINGS_TEST_DATABASE_URL` to its direct owner connection and
`WARNINGS_TEST_EXPECTED_HOST` to its verified endpoint. The test refuses existing
application tables, replays migrations and both manual stages, inserts only
synthetic fixtures, and checks warning counts/recency, expiry, target isolation,
classification, role permissions and retention. Write-rejecting triggers prove
report inserts cannot update or delete parking/rule rows. Normal tests skip this
integration without the variables. No real Evidence Source is approved.
