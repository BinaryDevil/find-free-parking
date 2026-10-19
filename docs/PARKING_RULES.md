# Server Parking Rules (#11)

> **Approvals:** this runbook predates [ADR-0005](adr/0005-agent-verified-gates.md). Where it asks for human or separate approval, follow ADR-0005's *Reading older runbooks* section; its other steps are unchanged.

`1791856800000_places_parking_rules.sql` creates empty `places` and
`parking_rules` tables. Geometry and place provenance are separate from typed
rules and their provenance. It does not backfill, update, delete, or retire
legacy rows, change report targets, approve sources, or create Coverage.
Unparsed rules retain raw public data and may leave schedule/rate fields NULL;
they evaluate to Unknown rather than inventing defaults.

## Evaluation and response

`lib/parking-rules.ts` takes rules, an absolute selected instant, the server's
current instant, the city's IANA timezone, intended stay in minutes and vehicle
type (`car`, `motorcycle`, `commercial`, `ev`). Driver Warnings are passed
through unchanged. Results include `classification` (`VERIFIED_FREE`, `PAID`,
`RESTRICTED`, `UNKNOWN`), an explanation code, time limit, rate, next-change
instant, active rule IDs, source, retrieval date (`asOf`) and Driver Warnings.
Explanation codes are API data; richer localized popup explanations and stay /
vehicle controls remain #30.

Precedence follows #2: no-stopping/tow-away, no-parking/loading, temporary
no-parking, permit conditions, payment, explicit free permission. Visitor
allowances do not waive payment. Limits and vehicle conditions remain binding.
Missing permission, unsupported evidence, incomplete E2/E3 permission,
unparsed rules, failed latest syncs and stale evidence cannot establish free
parking. Freshness is checked against both retrieval and latest sync, capped at
ADR-0002's seven days (24 hours for E5), using current server time and the
selected instant. An intended stay crossing a change to paid/restricted is
restricted; crossing into unknown is Unknown. Departure exactly at a boundary
does not include that boundary. Schedules have minute precision, exclusive ends,
and overnight ranges belong to the starting weekday. All-day means 0–1440;
equal endpoints are ambiguous. DST repeated hours and offset transitions are
evaluated as absolute instants. Next-change search covers the next weekly
cycle plus one day and includes freshness expiry and reservation boundaries.
E6 official-lot evidence is accepted only for a `lot` place, never a street;
when visitor parking requires payment the paid decision cites the payment
source and retrieval date.

`/api/parking` and `/api/parking/zones` accept `at` (ISO instant with offset),
`stayMinutes` (0–10080) and `vehicleType`. Legacy fields remain compatible,
with added server `classification` / `evaluation`. `legacyTimeZone` preserves
the viewer-clock behavior of #18's **listed payment information only**. It
cannot affect the evidence evaluator, which always uses `places.timezone`.
Without this optional parameter the interim display uses America/Vancouver.

## Dark launch boundary

`approvedParkingPlaceIds()` is the closed seam for #12: it returns no IDs.
There is no environment or request override. #12 must resolve place IDs within
approved `coverage_areas` and validate all required sources before replacing
this seam and the interim `coverage: {level: 'none'}` response. City polygons,
registry entries, source approval alone and seeded rows cannot open the gate.
With the gate closed, no new tables are queried and `places` is empty, including
when synthetic approved records exist. Existing map behavior remains #18.

The main parking response's `places` contains classified GeoJSON features
(including lots/zones); the legacy zones endpoint retains its existing geometry
and filters. Map layers, safe text-only popup helpers and server-result
presentation are separated under `components/parking-map/`. Legacy tables
remain read-only to app traffic and continue serving context. Their historical
import tools are not retired by #11. New-place report targets / warning storage
are follow-up #13 work; do not enable Coverage before the dependent go-live work.

## Validation and rollout

`node --test tests/parking-rules.test.mjs tests/parking-api.test.mjs` checks
evaluator, selection, presentation and the closed gate without a database.
`tests/parking-rules-db.test.mjs` checks real PostGIS queries and both actual
GET handlers, fresh migration replay, unchanged legacy columns, repeat history,
failed sync degradation and read-only runtime grants. Provision a **new empty**
database named `parking_rules_test` (or a numeric suffix) on an explicitly
disposable validation branch. Privately set `RULES_TEST_DATABASE_URL` to its
direct owner connection and `RULES_TEST_EXPECTED_HOST` to the provider-verified
endpoint. It refuses a populated database; it never loads app `.env.local`.
Synthetic source approval in this test approves no real source or area.

Before any shared/production application, integrate reviewed SQL, follow
[DATA.md](DATA.md), verify branch/database identity and an adequate restore
point, review pending migrations and obtain separate approval naming the commit
and target. Apply through the guarded direct-owner migration command, then
verify two empty new tables, constraints/indexes/SELECT-only app grants,
unchanged legacy data/report behavior and repeat migration history. #9/#10
approval does not extend to this migration. No import, source approval or
Coverage activation belongs to this operation. Rollback redeploys prior code
against the additive schema; no down migration or data removal is required.

Source implementation, disposable validation, shared integration, deployment
and production verification are separate states. The implementation does not
authorize production migration application or a production release.
