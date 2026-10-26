# No Restriction Found: register, roles and checker

Refs [#135](https://github.com/BinaryDevil/find-free-parking/issues/135) and the [ADR-0001 amendment](../adr/0001-verified-rules-only.md#no-restriction-found-amendment). The amendment's rules 1–5 are the spec. This page records the data shape chosen to implement them.

**Status: dark.** No register is approved or measured, nothing loads registers into the served evaluator, and no API or UI emits the new class. Display is [#136](https://github.com/BinaryDevil/find-free-parking/issues/136); measurement is [#137](https://github.com/BinaryDevil/find-free-parking/issues/137).

## Schema (`sql/preservation-v1/1792972800000_no_restriction_found.sql`)

Additive only. All three tables are owner-written and read-only to `app_rw`.

- **`evidence_source_roles`**: a source approved for a role under rule 2 or rule 4. One row per `(source_id, role, place_type)`.
  - `role` is `parking_layer` (rule 2) or `temporary_restrictions` (the E5 role in rule 4).
  - `place_type` is `street` or `lot`.
  - `approved` requires two approvers, two approval references (ADR-0005), `approved_at` and the inventory path. The checker also requires the two approvers to be distinct, the source type to fit the role (`E1`, `E3` or `E6` for a parking layer, `E5` for temporary restrictions), and the source itself to be approved.
- **`restriction_registers`**: one pre-registered register per Coverage area and version, with the same two-agent approval columns. `measurement_ref` and `measured_at` record the rule-5 measurement that passed. They may be set only on an approved register. An approved register without a measurement is still dark.
- **`restriction_register_sources`**: maps `(register_id, category, place_type)` to each approved source that records that category. A category with no row for a place type is a **missing category**: it does not withhold, it is named in the result.

Categories: `no_stopping`, `tow_away`, `no_parking`, `peak_hour`, `loading`, `bus_transit`, `disabled_only`, `permit`, `eligibility`, `vehicle_class`, `school_zone`, `street_cleaning`, `events_closures`, `temporary`, `payment`, `time_limit`.

## Checker (`lib/no-restriction-found.ts`)

`checkNoRestrictionFound(input)` is pure: callers load the rows and resolve geometry. It never grants a stronger answer.

**Inputs.**
- `register`: approval state, approvers, references, measurement, and its entries (`category`, `placeType`, `sourceId`).
- `sources`: every register and parking-layer source with evidence type, approval, roles, last successful sync, format check, freshness limit and, for citations, `dataAsOf`.
- `place`: id, `placeType`, and for streets the `blockId`.
- `parkingLayer`: the record that positively records this exact side or lot. It has its source, record id, as-of date, whether every assigned sign is parsed (E3), and any `limit` the layer itself records (minutes, bands, `scheduleComplete`). That limit is checked like a time-limit restriction at the place.
- `restrictions`: candidate records near the place. Each has:
  - its source and category, where `null` means it cannot be classified;
  - `bands` (days and minutes) with `scheduleComplete`;
  - `limitMinutes` for time limits and lot maximums;
  - `exemptVehicles`, and `operator` for lot rules;
  - `location`, one of `exact` (place id), `point` (distance to this side or lot footprint), `block` (block id), `area` (distance; 0 is inside) or `unknown`.
- `instant`, `now`, `timeZone`, `stayMinutes` (default 120, reported as assumed), `vehicleType` (default `car`), `generalLimitMinutes` (the jurisdiction's limit, if any).

**Output.**
- `NO_RESTRICTION_FOUND`, with the rule-1 `variant` and `textKey`, `notVerified: true`, the limit that fits (minutes and bands), the stay used and whether it was assumed, `sourcesChecked` (`id`, `name`, `asOf`) and `missingCategories`.
- Or `WITHHELD`, with every reason that applies (withholding is a union), plus the same sources and missing categories.

**Variants.**
- `no_limit`: a payment source covers the place type and no limit applies.
- `limit_fits`: a payment source and a fitting limit.
- `no_payment_source`: no payment source and no limit.
- `limit_no_payment_source`: no payment source and a fitting limit.

**Withholding reasons.** Each maps to one rule-4 clause or a precondition from rules 2, 3 and 5:

| Reason | Rule |
| --- | --- |
| `register_not_approved`, `register_not_measured`, `register_source_unapproved` | 3, 5 |
| `no_parking_layer`, `parking_layer_ineligible`, `parking_layer_unparsed` | 2 |
| `restriction_applies` | 4: payment, permit, eligibility or any category at the selected time and vehicle |
| `restriction_recorded` | 1, 4: coordinator decision on #139. A listed source records payment or a restriction category for the place at any time, even with a complete schedule and outside its hours. Rule 1's fixed texts say no payment or restriction is recorded here, so the label is withheld. Expired dated records do not count; time limits are handled by the limit variants. |
| `limit_exceeded` | 4: a limit or lot (operator) maximum shorter than the stay |
| `incomplete_schedule` | 4: silence outside listed hours |
| `empty_band` | 4: an empty or null band is Unknown |
| `unclassifiable_record` | 4 |
| `uncertain_location` | 4: an `unknown` location; the 15 m, both-sides and lot-wide rules decide which records reach the place |
| `operator_conflict` | 4: operators publish different rules for one lot |
| `stale_source`, `stale_citations`, `no_temporary_source` | 4: freshness and E5 |
| `stay_too_long` | 4: 72 h or the jurisdiction's general limit; operator maximums report `limit_exceeded` |
| `invalid_input` | malformed time, stay or time zone |

`evaluateWithNoRestrictionFound(base, check)` keeps the existing evaluator's answer unless it is `UNKNOWN` and the check passed. So a stricter answer always wins, and Verified Free is never weakened.
