# City of North Vancouver public-source review — 2026-10-21

Scope: [#50](https://github.com/BinaryDevil/find-free-parking/issues/50), City only, independently refreshed from official endpoints by the review agent. This supersedes the [2026-10-19 review](north-vancouver-review-2026-10-19.md)'s rights-only exclusions under amended [ADR-0002](../adr/0002-evidence-source-policy.md) criterion 6. **All candidates remain unapproved; Coverage none; inventory draft.** This is a fresh bounded assessment, not author/reviewer agreement on approval.

## Retrieval and retained evidence

[Selected evidence packet](north-vancouver-evidence-2026-10-21.json), SHA-256 `da00d232c8314483f0cbfce553e54dbe1a59a4e6b7ba1388537437f00b989e2e`, records retrieval time, exact endpoints, complete field-name lists, geometry types, counts, positive record-date maxima, attribution metadata and selected public records/geometries. No editor/creator identities, contact details or private eligibility/address values were requested or saved. Field names alone are schema evidence. Public curb geometry is not a driver location. Full paginated exports were used transiently to compute counts/maxima and are not committed.

For each listed layer, fetched `?f=json`, `/query?where=1%3D1&returnCountOnly=true&f=json`, and explicit allowlisted `outFields` with OBJECTID ordering, 1,000-row offsets and pagination until `exceededTransferLimit` was false. All fetched row totals equal the count query. Geometry was separately fetched in EPSG:4326 for the twenty comparison records and resident sample 1. Item metadata used each parent `MapServer/info/iteminfo?f=json`. These official public requests succeeded without credentials, payment or bypass. All ten layers have empty `licenseInfo` and `copyrightText`; retained as attribution observations, never a rejection reason. No published runtime cadence or populated layer `editingInfo` was found.

| Layer (exact endpoints in packet) | Rows | Geometry | Positive edit / attribute maximum UTC |
|---|---:|---|---|
| StaffMap 133 regulations | 4,330 | polyline | 2026-04-20 / 2026-04-15 |
| StaffMap 132 signs | 2,615 | point | 2026-08-12 / 2026-08-25 |
| StaffMap 136 permit areas | 14 | polygon | none / none |
| ResidentPermitParking 0 spaces | 754 | polyline | 2024-07-30 / none |
| ResidentPermitParking 1 zones | 14 | polygon | none / none |
| pparking 3 pay curbs | 223 | polyline | no date fields |
| pparking 4 pay zones | 7 | polygon | none / none |
| pparking 2 lots | 28 | point | no selected date signal |
| curbaccessparking 1 | 1,173 | polyline | no date fields |
| curbaccessparking2 1 | 1,173 | polyline | no date fields |

A null maximum means no positive timestamp, not 1970 or current data. Negative sentinel dates are excluded. Maximum dates say nothing about the currency of individual records or successful application sync.

## Ten fresh location comparisons

Re-fetched the ten previously selected representative pairs to test whether known conflicts had changed. They span time limits, permit exemptions, payment and prohibitions. All pairs have matching public block labels and sign-point distance to the rule polyline rounding to 0.00 metres (local planar longitude × 73,000 / latitude × 111,000). This verifies proximity only: exact direction, arrow, side, extent and completeness are still unproved. These are separate official layers, but their shared origin is not independent confirmation of accuracy.

| Rule / block | Fresh regulation | Fresh sign | Safety assessment |
|---|---|---|---|
| 59 / 1000 Marine Dr | 1 HR, 9AM-6PM | 471 time limited; duration/hours null | Missing corroborating schedule |
| 68 / 1600 Mackay Ave | 2 HR, 9AM-6PM | 578 same text | Text agrees; assignment/completeness pending |
| 69 / 300 Mackay Rd | 4 HR; hours null | 587 same | Schedule unknown |
| 3197 / 300 Hanes Ave | NO PARKING; hours null | 674 same | Prohibition category agrees; scope unconfirmed |
| 3199 / 100 Donaghy Ave | NO PARKING; hours null | 699 same | Prohibition category agrees; scope unconfirmed |
| 3191 / 900 W 1st St | NO STOPPING; hours null | 593 same | Prohibition category agrees; scope unconfirmed |
| 7774 / 100 W 3rd St | PAY PARKING, 4 HRS, 9AM-9PM | 94 TIME LIMITED, 1 HR, 9AM-6PM | Payment and duration conflict unresolved |
| 7786 / 200 Lonsdale Ave | PAY PARKING, 4 HRS, 9AM-9PM | 44 TIME LIMITED, 1 HR, 9AM-6PM | Payment and duration conflict unresolved |
| 241 / 600 W Keith Rd | Except with permit, 2 HR, 9AM-6PM; exemption True | 1012 time limited, same limit/hours; exemption YES | Exemption corroborated as flag; exact zone/entitlement unresolved |
| 535 / 1300 Delbruck Ave | Except with permit; limit/hours null | 3053 NO STOPPING | Safety conflict or adjacent prohibition unresolved |

W 3rd/Lonsdale rule dates are 2025-12-03; sign attribute dates are 2018-11-20 with null edit dates. Newer rule records plus the [City pay page](https://www.cnv.org/Streets-Transportation/Parking/Pay-Parking) make StaffMap regulations a better **candidate** than old sign text for pay source selection; they do not prove installed block extents or clear conflicting signs. The page dates the program rollout to September 2025 and effectiveness to sign installation on each block. pparking's matching view is corroboration of representation, not an independently current field observation. Do not choose a convenient record or approve either conflicting curb.

The pay page confirms daily 09–21 including holidays unless otherwise posted, mandatory registration for the initial zero-charge 30 minutes, then $1 for the next half hour, $3/hour daytime, $2/hour evening, and a $0.15 app fee above 30 minutes. It also describes overnight zero charge and zone-matched exemptions. These program terms do not assign a tariff, prohibition or exemption to a particular curb.

The [City regulations page](https://www.cnv.org/Streets-Transportation/Parking/Parking-Rules-and-Regulations) ties permit exemptions to the zone shown on signs and describes accessible/loading/fire conditions. Its unsigned 72-hour guidance includes other unsigned exclusions, so remains unsuitable as an E7 permission default. The [permit page](https://www.cnv.org/Streets-Transportation/Parking/Resident-and-Visitor-Parking) distinguishes signed implementation from eligibility. No private eligibility information was retrieved. These pages improve grammar context, not exact location verification.

Resident sample 1 was independently re-fetched with geometry: `PAY PARKING - EWP`, Existing, blank duration/restrictions, edit 2024-07-30. This is a fresh observation of old data, **not** the fresh independent safety re-review needed to accept over-24-month records. Current generic pay guidance cannot document the legacy EWP code or assign current signed rights to that line.

## Seven-criterion result and next work

| Criterion | Result and remaining evidence |
|---|---|
| 1 Authority | Pass for listed candidates: City GIS official channel. District data excluded. |
| 2 Machine-readable/stable | Queryable with IDs and recorded fields; full pagination confirmed. Longitudinal ID/geometry stability and adapter validation remain unverified. |
| 3 Precision | Geometry types meet candidate minima; exact curb/sign side/extents and lot entrance precision remain pending. Permit eligibility polygons alone confer no curb rights. |
| 4 Semantics | Public program guidance refreshed; missing schedule grammar, zone-to-signed-curb association, exceptions and per-record applicability remain pending. Blank schedules never mean all day. |
| 5 Freshness | Regulations/signs expose heterogeneous timestamps. Other layers lack a usable populated signal/cadence; resident data needs a fresh safety re-review. Retrieval now is not source maintenance now. |
| 6 Public availability | Pass for all ten retrieved layers. Empty licence text has no adverse effect. |
| 7 Safety checks | Ten comparisons freshly repeated; zero-contradiction requirement not met. Payment and no-stopping conflicts, missing schedules and exact assignment remain pending. |

**Per-source verdict:** regulations, signs, permit areas/zones, resident spaces, pay curbs/zones and curb views remain **pending** for the specific gaps above. Lots remain rejected as import-ready permission evidence for missing complete conditions/precision/currentness; public availability passes. Secondary accessible/legacy-resident feeds and E5 discovery were not freshly re-reviewed; prior substantive limitations remain. No new discovery sweep or claim of complete sign inventory was made.

[#50](https://github.com/BinaryDevil/find-free-parking/issues/50) remains open; no approved subset exists. [#31](https://github.com/BinaryDevil/find-free-parking/issues/31) adapters remain source gated; live #11, #12 and #15 are closed as checked in this review. Their implementation state does not approve a source. The future partial target is only precise reconciled City curb segments with complete conditions. All other curbs, lot permission, polygon interiors and District streets remain Unknown. No outreach, adapter, database write, source activation or production action occurred.
