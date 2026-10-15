# Seattle Blockface adapter preparation (#25)

The [adapter](../scripts/adapters/seattle-blockface.ts) reads SDOT Blockface and
produces candidates for the [#11 places/rules model](PARKING_RULES.md).
It does not approve the source, register Coverage or load real-source records.
The [Seattle inventory](sources/seattle.md) and #24 approval gate remain unchanged.

## Output and sync integration

`seattleBlockfaceAdapter` structurally implements #15's `SourceAdapter`:
`sourceKey=seattle-blockface`, `area=Seattle`, `evidenceType=E1`, and
`fetchSnapshot(signal)` returns `{ complete:true, sourceEditedAt, places }`.
The [#15 sync runner](https://github.com/BinaryDevil/find-free-parking/issues/15)
owns source matching/approval, transactions, upserts, retrieval timestamps,
failed-format history, drift and tombstones. Register this adapter in its registry
when that runner is integrated; registration is code wiring, not source approval.
No second importer, scheduler, schema or seed command is added here.

Each place uses `ELMNTKEY` as `sourceRecordId`, `kind=curb`, `city=Seattle`,
`timezone=America/Los_Angeles`, WGS84 line geometry and reviewed public raw fields.
Rule IDs append stable semantic slots, such as `6357:paid:WKD:1`, `:peak`, `:rpz`
and `:NOPARK`. The layer export edit timestamp is preserved as `sourceEditedAt`;
it is not represented as a record inspection date. The runner owns `fetchedAt`.
Asset keys, unlike export `OBJECTID`, preserve upsert identity across exports.

The reader validates field names/types, values, geometry and edit metadata before
returning output. It requests the complete object ID list, reads pages of 200,
checks exact membership, rejects transfer limits/errors, and rechecks metadata
after retrieval. A dropped/renamed field, duplicate asset key, missing row or
changed export fails the entire run. Cancellation is passed to every request.
`adaptSeattleBlockface(layer, geojson)` is the pure recorded-fixture seam; it
does not claim that a fixture subset is a complete production snapshot.

## Conservative interpretation

- Paid weekday/Saturday/Sunday bands retain published days, numeric bounds,
  positive rates and the documented paid-area limit in minutes. Incomplete or
  zero-rate bands remain raw unparsed candidates. No rate is guessed.
- Peak text becomes an unparsed `no_stopping` candidate; it is never expanded
  into a continuous envelope or invented weekday/holiday schedule.
- No-parking, no-stopping, loading/transit and zone counts become typed unparsed
  caution candidates. They do not establish a whole-side prohibition schedule.
- RPZ eligibility flags become unparsed `permit_only` candidates with zone/area
  provenance; paid-area limits never become RPZ visitor allowances. #26 owns
  actual RPZ enforcement rules; #27 owns temporary overrides.
- Every side retains an unparsed extent/sign-completeness guard. Thus all output
  currently evaluates to Unknown, including “Unrestricted” categories and empty
  Sunday payment. No Free Parking Rule is emitted.

This is intentionally partial implementation of #25, not the ticket's completed
free/paid/restricted driver experience. Removing the guard requires precise
curb allocation, reconciled signs/schedule boundaries and applicable exceptions,
plus human source approval. Public API/map Coverage must remain closed until
those conditions and the Coverage resolver permit the actual places.

## Validation

`node --test tests/seattle-blockface.test.mjs` exercises recorded rates/limits,
peak/RPZ flags, schema/value changes, invalid geometry, paging, missing rows,
export changes, stable identities and Unknown behavior. Fixtures and their
retrieval details are [recorded here](../tests/fixtures/seattle-blockface/README.md).

`tests/seattle-blockface-db.test.mjs` is opt-in. Privately set
`BLOCKFACE_TEST_DATABASE_URL` to a **new empty** `seattle_blockface_test_25`
(or `seattle_blockface_test_25_<digits>`) database on a verified disposable Neon
branch and `BLOCKFACE_TEST_EXPECTED_HOST` to its direct provider endpoint.
It refuses application tables before replaying migrations. Never reuse shared
dev, production or an existing test database. After #15 integration it defaults
to this checkout; during the authorized batch only, `BLOCKFACE_TEST_SYNC_ROOT`
can select #15's isolated checkout for its runner and migrations. No sibling
files are copied or edited. Run the test with Node's test runner.

The isolated test imports through a **synthetic** approved source at
`example.invalid`, verifies repeat upserts/IDs/provenance, reads all 28 places
through `classifiedPlaces`, checks failed format validation preserves places,
and invokes the actual parking GET handler to confirm `places=[]` and Coverage
none. It creates no real approved source or Coverage record. Real-source
classifications and map acceptance stay open; no runtime gate is bypassed.
