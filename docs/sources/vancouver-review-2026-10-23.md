# Vancouver independent source review, 2026-10-23

Refs [#24](https://github.com/BinaryDevil/find-free-parking/issues/24) (Vancouver half only). Base `origin/dev` at `f6fed5d`. Reviewer: a fresh agent that did not author the [Vancouver inventory](vancouver.md), the [2026-10-19 partial review](review-24-2026-10-19.md) or the [2026-10-21 reassessment](review-24-vancouver-2026-10-21.md). This is the ADR-0005 reviewer re-check. Every endpoint, count, edit date, item and licence record and spot-check signal below was retrieved by this reviewer between 2026-10-23T19:38:38Z and 19:47:38Z UTC without sign-in, payment or access-control bypass. Earlier packets were not used as evidence.

**Verdict: no Vancouver source is approved and no Partial Coverage subset passes. Vancouver Coverage stays none.** The pre-registered subset (in-service City meters in three strata, plus permit-polygon blocks) produced 1 agreement, 8 contradictions and 3 unverified checks out of 12. A whole-population audit with the same rule shows that the sample was not unlucky: 64–77% of the meters in each meter stratum sit on a block where 2026 tickets record a signed restriction that no meter on that block carries. Shrinking the subset would mean filtering on the ticket data, which is the signal that grades it. That would make the check circular. The permit polygons fail criterion 4 on their own, because they publish no hours.

No database write, import, source activation, deployment, outreach or merge took place.

## Evidence files

All files are in [`artifacts/vancouver-review-2026-10-23/`](../../artifacts/vancouver-review-2026-10-23/), with `SHA256SUMS`.

| File | Contents |
|---|---|
| [subset-preregistration.json](../../artifacts/vancouver-review-2026-10-23/subset-preregistration.json) | Strata, claims, sampling seed, block-mapping rule, counted signal, ticket categories, contradiction, agreement and pass rules. Written at 2026-10-23T19:43:09Z and pushed in commit `da1c4c4` at 19:43:15Z, **before** any ticket record for a sampled block, City web page or paMeter record was fetched. Before it, only the source data and the signal's vocabulary (citywide infraction-text and status counts, three unfiltered rows for field formats) had been read. |
| [spot-check-sample.json](../../artifacts/vancouver-review-2026-10-23/spot-check-sample.json) | The 12 checks: full meter record, block mapping with distances, meters on the block, grouped 2026 tickets for the block, paMeter transcription result, grade and reason. |
| [population-audit.json](../../artifacts/vancouver-review-2026-10-23/population-audit.json) | The same grading rule applied to every member of every stratum, plus a post-hoc street-name variant. |
| [register.json](../../artifacts/vancouver-review-2026-10-23/register.json) | Seven ArcGIS layers (count, geometry, WKID, edit dates, fields, item owner, access, licence), ten portal datasets (count, modified, licence, fields), GDH meter layer, legacy Road Ahead feeds and the licence page. |
| `raw/` | Unmodified responses: meter export, permit polygons and street blocks (gzip), per-check ticket and paMeter responses, the grouped 2026 ticket export, metadata, and `web-signals.json` (City page excerpts). The legacy Road Ahead Atom/GeoRSS bodies are not committed because they embed staff names, e-mail addresses and phone numbers; `register.json` keeps their size, SHA-256, entry counts and dates. |
| `method/` | `prereg.py`, `sample.py`, `audit.py`, `register.py` and `common.py`. Re-running them reproduces the files above, given the same live data. |

## Fresh retrieval, criteria 1, 2, 5, 6

Criterion 1 (authority) and criterion 6 (public availability) pass for every row below. ArcGIS items are owned by `City_of_Vancouver` with `access: public`; portal datasets are published by the City on its open-data portal. All were retrieved anonymously. Licence text is recorded but is not a gate. All ArcGIS layers are native EPSG:26910.

| Source | Count | Last edit (UTC) | Licence shown |
|---|---:|---|---|
| Portal `parking-meters` (E2) | 3,523 | modified 2026-10-19T13:31:55Z (weekly extract) | Open Government Licence – Vancouver |
| Hosted `paMeter/0` (E2 alternate) | 3,522 | 2026-10-23T10:03:00Z | CC BY |
| GDH `paMeter/MapServer/1` (E2 alternate) | 3,522 | no layer edit date exposed | none |
| `ResidentialParkingPermitZones/0` (E4) | 545 (362 distinct `MAPID`; 217 RPP, 206 VRPP, 122 RPO) | 2026-10-23T09:20:54Z | CC BY |
| `Road_Ahead_View/0` (E5) | 777 | 2026-10-23T19:43:57Z | none |
| Portal Road Ahead extracts: current closures / under construction / upcoming | 23 / 68 / 199 | 2026-09-17T13:31:44–48Z | OGL – Vancouver |
| Legacy Road Ahead Atom / GeoRSS (E5) | 290 / 3,678 entries | feed header 2026-10-23 12:00Z; newest entry 2026-09-16T22:35Z | "Copyright 2016, City of Vancouver" |
| `DisabilityParking/0` / portal `disability-parking` | 163 / 163 | 2026-10-19T09:27:37Z / 2026-08-24T13:30:39Z | CC BY / OGL |
| `COVMotorcycleParkingNonMetered/0` / portal `motorcycle-parking` | 86 / 224 | 2026-10-19T09:34:54Z / 2026-10-19T13:31:20Z | CC BY / OGL |
| `COVCarShareParking/0` | 99 | 2026-10-23T08:03:10Z | CC BY |
| `RoadAheadHistoricFilmPermits_3820d/0` | 478 | 2026-10-23T11:08:46Z | none |
| Portal `parking-tickets` (signal, 2026-01-02 to 2026-09-30) | 357,691 | 2026-10-15T13:54:50Z | OGL – Vancouver |
| Portal `parking-tickets-2020-2025` (signal) | 2,472,917 | 2026-06-01T23:08:21Z | OGL – Vancouver |
| Portal `public-streets` / `street-intersections` (location only) | 17,072 / 6,125 | 2026-07-27 | OGL – Vancouver |

Changes since 2026-10-21: the legacy Atom and GeoRSS feeds now return HTTP 200 (they returned 403 then), but their newest entry is from 2026-09-16, so they are no fresher than the portal extracts. The portal and hosted meter feeds are now different snapshots (3,523 rows modified 2026-10-19, against 3,522 edited 2026-10-23). The [licence page](https://opendata.vancouver.ca/pages/licence/) returned HTTP 200 at 19:46:52Z, but its licence text is rendered by script and is not in the static HTML; the dataset metadata `license` field above is the recorded text.

## The tested subset (pre-registered)

Common meter filter: `service_status='In Service'`, `vehicle_type='Any Vehicle'`, both override flags `No`, both rates present, and all four time limits one of `2 Hr`, `3 Hr`, `4 Hr`. This drops Removed and Out of Service meters, motorcycle, accessibility and EV meters, overrides, and null, `No Time Limit`, `13 Hr` and `30 Min` limits.

| Stratum | Case | Extra filter | Population | Claim tested |
|---|---|---|---:|---|
| MT | metered, time-limited | no rush window, no prohibition | 1,932 meters | Paid 09:00–22:00 daily at the listed rates and limits; Verified Free 22:00–09:00 |
| MR | rush-hour no stopping | a rush window, no prohibition | 440 meters | Restricted during each rush window on every day (days are undocumented); paid otherwise 09:00–22:00 |
| MX | no-parking / prohibition | complete prohibition slot(s) | 246 meters | Restricted for the named zone on the listed days and times; paid otherwise 09:00–22:00 |
| P | permit | `public-streets` 100-blocks whose midpoint is inside a permit polygon and to which no meter maps | 1,239 blocks | Restricted (permit) at all times; never free; hours Unknown |

Sampling: `random.Random(20261023)`, three per stratum in the order MT, MR, MX, P. Each meter maps to the nearest City `public-streets` 100-block within 30 m (ambiguous if another block is within 3 m).

**Counted signal:** the City's current `parking-tickets` dataset (2026 tickets, all statuses), matched on block number and exact street text. It is an official enforcement record, independent of the meter asset system, but it is located only to the 100-block (both sides) with no time of day. **Contradiction:** for a meter check, a 2026 ticket on the block for a signed restriction (no stopping, rush-hour congestion route, commercial or general loading, passenger, tour bus, bus stop, reserved vehicle class, disabled, bicycle facility, no parking, sign-restricted parking) that no meter mapped to the block carries. For P, any metered-space ticket on the block. **Agreement** needs no contradiction plus corroboration: a metered-space ticket (MT, MR, MX), the matching restriction ticket (MR, MX), or a sign-restricted or no-parking ticket (P). Anything else is unverified. **Pass:** at least 10 agreements, zero contradictions and every stratum represented.

Because the feed gives meter points rather than curb extents (criterion 3), an unrepresented restriction on the same block cannot be excluded from the curb a meter claims. The rule therefore fails closed and is side-blind. This is coarser than Seattle's same-side sign check, and the per-check reasons below show which restriction drove each result.

## Twelve spot checks (criterion 7)

Signals: 2026 tickets (retrieved 19:44:22–19:44:29Z); the City page [Time-limited and pay (meter) parking](https://vancouver.ca/streets-transportation/time-limited-metered-parking.aspx) for the general claim; and the hosted paMeter record with the same `FID_METER`, as a transcription check that is **not** independent (same City asset system).

| # | Meter / block | Feed says | 2026 tickets on block | Result |
|---|---|---|---|---|
| MT1 | 302911, 2900 W BROADWAY (9 m) | $1.50 / $1.50, 2 Hr; no rush or prohibition on any of 17 block meters | 514 metered; 1 no-stopping, 1 bus-stop, 12 reserved-class | **Contradiction:** no stopping and bus stop not carried |
| MT2 | 303031, 3000 W BROADWAY (9 m) | $1.50 / $1.50, 2 Hr; no rush or prohibition on any of 28 block meters | 848 metered; 5 no-stopping, 4 disabled, 1 sign-restricted | **Contradiction:** no stopping not carried |
| MT3 | A40115, 100 E 4TH AV (6 m) | $1.50 / $1.50, 2 Hr | none: tickets spell the street `E 4TH AVE` | **Unverified** (pre-registered name rule) |
| MR1 | 301732, 1700 W BROADWAY (10 m) | AM 07–10, PM 15–19 | 153 metered; 35 rush; 11 bus-stop | **Contradiction:** bus stop not carried |
| MR2 | 300022, 0 W BROADWAY (10 m) | AM 07–10, PM 15–19 | 9 metered; 5 rush; 3 no-stopping; 3 bus-stop | **Contradiction:** bus stop not carried |
| MR3 | 772704, 2700 ARBUTUS ST (7 m) | AM 07–09:30 (other block meters PM 15–18) | 90 metered; 11 rush; 1 no-stopping; 5 bus-stop | **Contradiction:** bus stop not carried |
| MX1 | 0M2415, 2400 BLENHEIM ST (5 m) | CVLZ 7 days 09–18; 3 Hr | 105 metered; 131 commercial loading; 12 no-stopping; 1 tour bus | **Contradiction:** no stopping and tour bus not carried |
| MX2 | 1112NNS, 1200 W GEORGIA ST (10 m) | NO STOPPING 7 days 07–19; one Zone Only meter on block | 19 sign-restricted; 5 no-stopping; 2 rush; no metered tickets | **Contradiction under the rule:** rush not carried as a rush window. The meter's own 07–19 no-stopping window covers both rush periods, so this one does not mislead a driver. |
| MX3 | 060612, 600 W HASTINGS ST (10 m) | PASSENGER ZONE 7 days 19:00–02:00; AM/PM rush | 67 metered; 60 rush; 29 no-stopping; 4 bus-stop; 1 tour bus; 1 disabled | **Contradiction:** bus stop, tour bus, disabled not carried |
| P1 | 1000 BUTE ST, RPP025 West End Plateau | permit, all times | 4 sign-restricted; 16 time-limit; 7 no-stopping; no metered | **Agrees** |
| P2 | 3800 CAROLINA ST, RPO012 | permit, all times | 22 tickets, all statutory or other | **Unverified:** no sign-restricted ticket |
| P3 | 1300 W 11TH AV, RPP016 Oak West | permit, all times | none: tickets spell `W 11TH AVE` | **Unverified** (pre-registered name rule) |

Result: **1 agrees, 8 contradict, 3 are unverified.** That is not zero contradictions, so the subset fails criterion 7.

- **General signal agrees.** The City page (read in a browser at 19:45:38Z, after scripted requests got HTTP 403) states "Parking meters are in effect from 9am to 10pm, 7 days a week, including statutory holidays", and tells drivers to check for rush-hour, event and construction restrictions before paying. That matches the claimed paid hours and the rule that restrictions win. It says nothing about rush-hour days.
- **Transcription is clean.** All nine sampled meters have exactly one paMeter record by `FID_METER`, with zero differences on the 17 rule fields compared.
- **Post-hoc, not counted:** with the ticket spelling `AVE`, MT3 would contradict (4 no-stopping tickets, none of the 4 block meters carries no stopping) and P3 would agree (31 sign-restricted, 6 no-parking). The count would become 2 agree, 9 contradict, 1 unverified.
- **Why the meters fail.** Five of the eight are bus stops, which the meter feed has no field for. The other three (MT1, MT2, MX1) are no-stopping, tour-bus or disabled restrictions that the feed *can* carry, but no meter on the block does. MX2 is the only rule-only case.

### Whole-population audit: why shrinking does not help

[`population-audit.json`](../../artifacts/vancouver-review-2026-10-23/population-audit.json) applies the same rule to every stratum member, using one grouped export of all 357,691 2026 tickets (retrieved 19:47:38Z):

| Stratum | Members | Contradiction | Agreement-eligible (no contradiction, corroborated) | Unverified (name mismatch, range block, ambiguous mapping, no corroborating ticket) |
|---|---:|---:|---:|---:|
| MT | 1,932 | 1,235 (64%) | 74 | 623 |
| MR | 440 | 340 (77%) | 74 | 26 |
| MX | 246 | 172 (70%) | 12 | 62 |
| P | 1,239 | 21 (2%) | 461 agree | 757 |

With the post-hoc `AV`→`AVE` spelling, MT rises to 1,681 contradictions (87%). The most common unrepresented category in MT is no stopping (1,132 meters), then bus stop (319) and passenger zone (282).

The meter feed's own fields cannot pick out the safe meters: bus stops and most no-stopping portions appear in no meter field. Excluding the blocks that have tickets would use the grading signal to choose the subset. No third official curb signal exists in public sources: no sign inventory, no curb-space layer, no geocoded or timed tickets. ADR-0004 rules out new field evidence or requests. So no narrower meter subset was re-registered.

The permit stratum has few contradictions, but it cannot pass on its own. The polygons publish no days or hours (criterion 4). Its "restricted at all times" claim is a conservative invention, not a schedule read from the source. A sign-restricted ticket is also not specific to permits. The 21 permit blocks with metered-space tickets but no mapped meter were not investigated; they may be meters that map to a neighbouring block, or gaps in the feed.

## Per-source verdicts (2026-10-23)

C1 and C6 pass for every row (see above). "Pending" names what is missing; "rejected" names the failed criterion for that role.

| Source | C2 | C3 | C4 | C5 | C7 | Verdict |
|---|---|---|---|---|---|---|
| Portal `parking-meters` (E2) | pass: `feature_id` unique (#28, PR #122) | **fail as a curb claim:** meter points, no extent; restrictions on the same block are not represented | rush-hour days undocumented (City page silent); override and flat-rate semantics undocumented | pass: weekly, 2026-10-19 | **fail:** 8 of 12, 1,747 of 2,618 stratum meters | **pending** (C3/C4/C7) for paid use. After-hours free: **rejected** on current evidence (E2 boundary not met: the feed does not carry the block's other restrictions). |
| Hosted `paMeter/0` (E2 alternate) | pass: `FID_METER` = portal `feature_id` | as portal | as portal | pass | not independent; 9/9 transcription matches | **pending** (C3/C4/C7) |
| GDH `paMeter/1` (E2 alternate) | pass | as portal | as portal | **pending:** no layer edit date | not run | **pending** (C3/C4/C5/C7) |
| `ResidentialParkingPermitZones/0` (E4) | pass: `MAPID` plus polygon part | pass: polygon | **fail:** no days, hours or visitor fields | pass: 2026-10-23 | 1 agree, 2 unverified, 0 contradictions in sample; audit 21 of 1,239 contradict | **pending** (C4/C7) |
| `Road_Ahead_View/0` (E5) | pass: `planitid` | project envelopes, not curbs | phase, recurrence and status semantics unresolved | pass | not run this session | **pending** (C3/C4/C7); override-only, never free |
| Portal Road Ahead extracts (×3, E5) | pass | approximate segments | completion date only | 2026-09-17 extract, behind the hosted view | not run | **rejected** as standalone E5 (C3/C4) |
| Legacy Atom / GeoRSS (E5) | XML, no documented schema | not checked | not checked | newest entry 2026-09-16 | not run | **pending** (C2/C3/C4/C7); now publicly retrievable |
| Disability, motorcycle, carshare layers | pass | designated points, extent unknown | partial | pass | not run | **pending** as restriction supplements; **rejected** as ordinary-vehicle free evidence (vehicle context) |
| `RoadAheadHistoricFilmPermits_3820d` | pass | polygons | historical permits | current edit, historical content | n/a | **rejected** as current rules (C4) |
| Parking tickets (2026, 2020–2025) | signal | 100-block, no side | no time of day | pass | used as the signal | **rejected** as Parking Rule evidence (signal-only type) |
| By-laws 2849 / 2952 (E7) | not re-fetched this session | — | — | — | — | **rejected** for E7 (no signs-only-exceptions default), per the 2026-10-21 record; not re-verified here |

## Intended `evidence_sources.approval_state` for a future release PR

None changes to `approved`. If Vancouver rows are created, the values are:

- `pending`: portal `parking-meters` (paid use only), hosted `paMeter/0`, GDH `paMeter/1`, `ResidentialParkingPermitZones/0`, `Road_Ahead_View/0`, legacy Atom/GeoRSS, disability, motorcycle and carshare layers (as restriction supplements).
- `rejected`: meters as after-hours free evidence, portal Road Ahead extracts as standalone E5, historic film permits, ticket datasets, the E7 by-law default.

No `coverage_areas` row and no `subset_geom` is proposed. The city-page sentence stays "Vancouver is not covered."

## Unknown areas and why

- **All Vancouver streets stay Unknown.** No source passed all seven criteria, and the one subset tested failed criterion 7.
- **Metered curbs:** the feed gives points, not curb extents, and does not carry bus stops or most no-stopping portions on the same block (64% of the cleanest metered meters). Rush-hour days are not documented. Paid display would risk sending drivers to a stop or zone; after-hours free is unsupported.
- **Permit polygons:** eligibility areas without published hours, days or visitor rules; signed curbs within them are not identified.
- **Unmetered blocks outside permit polygons:** no E1 or E3 source exists. Absence of meters, tickets or polygons never establishes permission.
- **Temporary restrictions:** Road Ahead geometry is project envelopes, not curbs; no independent schedule signal was checked this session.
- **Lots:** no import-ready E6 source.

## Follow-ups

1. **#28 / #24:** a metered paid subset needs a curb-extent source (space or block-face geometry with bus stops, no-stopping and loading portions). None is public today; under ADR-0004 that stays a recorded gap, not a request. Re-test only if such a layer appears on the City portal or GIS server.
2. **#29:** permit polygons need published hours before any E4 claim. If a future review tests a permit-only subset, normalise ticket street names (`AV` → `AVE`) in its pre-registration, and do not treat sign-restricted tickets as permit-specific.
3. **#37:** the legacy Atom/GeoRSS feeds are reachable again but stale (newest entry 2026-09-16). Do not commit their raw bodies; they contain staff contact data.
4. **Method note for other cities:** City of Vancouver ticket data spells avenues `AVE` while `public-streets` uses `AV`; 100-block ranges such as `5700-5800` have no single block number.

## Validation

- `shasum -a 256 -c SHA256SUMS` in the artifact directory.
- Relative-link check on this file and `vancouver.md`. Every cited URL was retrieved this session (timestamps above and in `register.json`, `spot-check-sample.json` and `raw/web-signals.json`).
- `git diff --stat origin/dev` shows only `docs/sources/vancouver.md`, this file and the new artifact directory. `git diff --check` is clean for both docs, `method/` and the derived JSON files. It flags trailing whitespace only inside unmodified ArcGIS and portal responses under `raw/`, which are kept byte-exact so that `SHA256SUMS` matches what the servers returned (the Seattle packet in PR #123 has the same property).
- No application, DB or preview rungs apply to this docs/evidence change. No production or Neon access was used.
