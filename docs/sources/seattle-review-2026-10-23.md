# Seattle independent source review, 2026-10-23

Refs [#24](https://github.com/BinaryDevil/find-free-parking/issues/24) (Seattle half only). Base `origin/dev` at `ef1ebba`. Reviewer: a fresh agent that did not author the [Seattle inventory](seattle.md) or the [2026-10-21 reassessment](seattle-public-review-2026-10-21.md). This is the ADR-0005 reviewer re-check. Every endpoint, count, edit date, item/licence record and spot-check signal below was retrieved by this reviewer between 2026-10-23T19:11:41Z and 19:19:14Z UTC (plus the archived `LOAD_ IS NOT NULL` count at 19:27:18Z), without sign-in, payment or access-control bypass. The 2026-10-21 packet was not used as evidence.

**Verdict: no Seattle source is approved and no Partial Coverage subset passes. Seattle Coverage stays none.** The review tested a narrower premise than earlier attempts did. It asked whether a mechanically defined subset of SDOT Blockface block sides (plus RPZ zones, excluding the known conflict zones) could pass on its own. It cannot. Blockface's own competing-use fields do not represent signed no-parking, no-stopping, loading, disabled-permit and peak tow-away portions. Across the whole subset population, a majority of the "clean" time-limited sides carry such signs. Shrinking the subset further would mean filtering on the sign inventory, which is the independent signal the spot check needs. That would make the check circular.

No database write, import, source activation, deployment, outreach or merge took place.

## Evidence files

All files are in [`artifacts/issue-24-seattle-review-2026-10-23/`](../../artifacts/issue-24-seattle-review-2026-10-23/), with `SHA256SUMS`.

| File | Contents |
|---|---|
| [register.json](../../artifacts/issue-24-seattle-review-2026-10-23/register.json) | 27 layers: name, geometry, native WKID, live `returnCountOnly` count, `lastEditDate`/`dataLastEditDate`, full field list. Six item records (owner, access, licence text, credits). Six Socrata signal views. |
| [subset-preregistration.json](../../artifacts/issue-24-seattle-review-2026-10-23/subset-preregistration.json) | Subset strata, claims, sampling seed and contradiction rule. Written at 2026-10-23T19:13:50Z, **before** any sign record was fetched. |
| [spot-check-sample.json](../../artifacts/issue-24-seattle-review-2026-10-23/spot-check-sample.json) | The 12 sampled sides: full Blockface record, every Parking Signs (layer 0) record and every Parking Features sign-text (layer 4) record on the same `ELMNTKEY`. |
| [stratum-sign-audit.json](../../artifacts/issue-24-seattle-review-2026-10-23/stratum-sign-audit.json) | Whole-population audit: for every side in strata T and P, which sign categories occur on it. |
| `raw/` | Unmodified responses: layer metadata and counts, item JSON, RPZ zone attributes, sign-category statistics, Curb Space probes, the SDOT rate page HTML, Socrata view metadata. |
| `method/` | The three scripts that wrote the files above. Re-running them reproduces the sample, given the same live data. |

## Fresh retrieval, criteria 1, 2, 5, 6

Criterion 1 (authority) and criterion 6 (public availability) pass for every ArcGIS layer below. Each service is owned by `Transportation_SeattleCityGIS` or `CityLight_SeattleCityGIS`, with item `access: public`, and was retrieved anonymously. The licence text shown on the Blockface, Parking Signs, RPZ, Pay Stations and TNP items is the City's accuracy disclaimer: "makes no representation or warranty as to its accuracy…". Credits read "City of Seattle, (Seattle) Department of Transportation". Parking Features shows no licence text. Under the amended criterion 6, that is recorded but is not a gate. Criterion 2 is met as a queryable JSON format with a recorded field list. Export `OBJECTID`s are not stable rule keys; adapters must key on `ELMNTKEY`, `COMPKEY`, `SPACEKEY` and reservation-plus-curbspace.

| Layer | Count 2026-10-23 | Last edit UTC | C5 |
|---|---:|---|---|
| Blockface/1 | 47,926 | 2026-10-23T13:56:08Z | current |
| Parking_Signs/0 | 98,146 | 2026-10-23T13:13:33Z | current |
| Parking_Features/4 (sign text) | 97,694 | 2026-10-23T10:28:52Z | current |
| Restricted_Parking_Zone_Areas/0 signed blocks | 72,188 | 2026-10-23T13:06:06Z | current |
| Restricted_Parking_Zone_Areas/1 eligibility | 4,461 | 2026-10-23T13:07:51Z | current |
| Restricted_Parking_Zone_Areas/3 game days | 2 | 2026-10-23T13:08:45Z | current |
| Restricted_Parking_Zone_Areas/4 zones | 35 | 2026-10-23T13:09:42Z | current |
| SDOT_Pay_Stations/0 | 1,631 | 2026-10-23T13:35:37Z | current |
| Temporary_No_Parking_1/0, /1, /2 | 1,196 / 2,815 / 84,121 | 2026-10-23T15:12:10–24Z | current |
| Temporary_No_Parking_Unpaid/10 | 1,178 | 2026-10-23T15:02:16Z | current |
| Curb_Space_Categories/6 | 40,539 | 2026-10-23T13:16:07Z | current |
| Paid_Area_Curb_Spaces/0 | 40,539 | 2026-10-23T13:23:47Z | current |
| Curb_Space_Categories_with_Symbology_(Active)/0 | 40,539 | 2026-10-23T13:16:07Z (data 2024-05-03) | data over 24 months |
| Curb_Space_Reserve_(Active)/0 | 12,632 | 2024-03-21T16:18:50Z | over 24 months |
| Peak_Hour_Parking_Restrictions/3 | 492 | 2026-10-19T17:20:47Z | current |
| Parking_Categories/0 | 46,234 | 2026-10-23T13:20:00Z | current |
| Parking_Tiers/0 | 37 | 2026-10-23T13:21:16Z | current |
| Curbspace_Transit_Layover/0 | 282 | 2026-10-23T12:53:41Z | current |
| Public_Garages_and_Parking_Lots/1 | 700 | 2026-10-19T17:22:07Z | current |
| Parking_Features/0, /2, /3 | 700 / 46,234 / 84,046 | 2026-10-23T10:17–25Z | current |
| Driveways_and_Parking_Lots/10, Dissolved/11, Parcels within 10 ft/1 | 141,161 / 1 / 140,023 | 2024-03-07 | over 24 months |

Socrata signal views (`/api/views/<id>.json`, licence "Public Domain" on all six): 72hr violations `74ix-6xdj` rows updated 2026-10-23T16:21:07Z; paid transactions `gg89-k5p6` 2026-10-23T14:03:43Z; last-48-hours `hiyf-7edq` 2026-10-23T17:08:58Z; 2026 occupancy `q2e4-e7e5` 2026-04-07T16:57:12Z; annual study `7jzm-ucez` 2019-11-26; infractions `jxcr-rhfz` 2019-06-12.

Cross-check against the 2026-10-21 packet (comparison only): counts moved as expected for live layers (signs 98,124 → 98,146; TNP current 844 → 1,196). RPZ signed blocks remain 72,188 rows against Blockface's 47,926.

## The tested subset (pre-registered)

Four strata of Blockface block sides, defined only by Blockface fields. A common filter applies to strata T, P and R: `BUS`, `NOSTOP`, `LOAD_`, `ZONE`, `TOTAL_ZONES` and `CARPOOL_SPACES` all 0 or null, `PEAK_HOUR` null, `OVERRIDEYN='N'`. Stratum N uses its own filter, shown in its row: `NOSTOP`, `PEAK_HOUR`, `OVERRIDEYN` and spaces only, so it does not filter `BUS`, `LOAD_`, `ZONE`, `TOTAL_ZONES` or `CARPOOL_SPACES`. Each stratum also makes the most conservative claim available:

| Stratum | Extra filter | Population | Claim tested |
|---|---|---:|---|
| T time-limited free | category Time Limited; `TL_SPACES>0`; paid, RPZ, `NOPARK`, `TOTAL_NOPARK` all 0; `PARKING_TIME_LIMIT` set | 499 | Free, with the time limit applied at all times |
| P metered | `CSM='Y'`; category Paid; `PAID_SPACES>0`; RPZ and TL spaces 0 | 401 | Paid at the listed bands; outside them Unknown, never free |
| R permit | category RPZ; `RPZ_SPACES>0`; paid 0; zone not 13, 14, 21, 22 or 25 | 1,915 | Permit-restricted during zone hours; outside them Unknown |
| N no parking | category No Parking Allowed; parking and total spaces 0; `NOSTOP` 0 | 247 | No parking at all times |

Zones 13, 14, 21, 22 and 25 were excluded up front because of the split, alternative or conflicting hours documented on 2026-10-19 and 2026-10-21. Sampling used `random.Random(20261023)`, three sides per stratum in the order T, P, R, N, giving 12 checks (the minimum is 10). A contradiction is any sign on the same `ELMNTKEY` that establishes payment, permit (RPZ or disabled), no parking, no stopping, tow-away, loading, bus use, or a shorter limit or different hours, and that neither the Blockface record nor the claim carries. It also covers stratum P rates that differ from the published SDOT table, and stratum R sign hours that differ from the zone polygon's `INEFFECT`.

## Twelve spot checks (criterion 7)

Independent official signals used:

- **Signs:** the SDOT sign inventory, both the structured layer 0 and the full-text layer 4. ADR-0002 names "the sign inventory" and "a second official layer" as independent signals. It is the same SDOT asset system, so this is not a field observation.
- **Rates:** the [SDOT street parking rates page](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/paid-parking-information/street-parking-rates), HTTP 200 at 2026-10-23T19:15:04Z.
- **Zone hours:** the RPZ zone polygons (layer 4) `INEFFECT`.

| # | Side (`ELMNTKEY`) | Source says | Independent signal | Result |
|---|---|---|---|---|
| T1 | 1ST AVE S, S DAKOTA ST to dead end, E (24250) | TL 120 min, no other use | Six "2 HOUR PARKING 7AM-6PM EXC SUN-HOL" signs, plus north/south-of-here plates | Agrees. Free with the 2 h limit at all times is conservative. |
| T2 | 20TH AVE NW, NW 56TH to NW 57TH, W (25929) | TL 60 min; `NOPARK`=0 | R7-WI30 "NO PARKING WITHIN 30 FEET" at 30 ft and R7-NPR no-parking arrow at 218 ft (side ends 238 ft), which appears only in layer 0 (no status field; included under the rule's "all if status absent"); 1 h 7–18 exc Sun/hol | **Contradiction: no parking.** This holds on the in-service R7-WI30 alone. |
| T3 | 30TH AVE NE, NE 50TH to NE BLAKELEY, W (72549) | TL 120 min | "2 H PARKING 7AM-6PM EXC SUN-HOL" plus south-of-here | Agrees |
| P1 | S WASHINGTON ST, 3RD AVE S to 4TH AVE S, N (21773) | Paid Mon–Sat 08–18, $1 then $2, `LOAD_`/`ZONE` 0 | Pay 8–6 exc Sun/hol; rates match Pioneer Square Edge ($1 / $2). Two R8-LUPSX "30 MINUTE LOAD AND UNLOAD ONLY EVERYDAY" | **Contradiction: loading-only zone** |
| P2 | S WELLER ST, 7TH AVE S to CANTON AL S, N (66621) | Paid Mon–Sat 08–20, $1 / $5 / $5.50; `NOPARK` 4 | "PAY TO PARK 8AM-8PM EXCEPT SUN-HOL"; rates match Chinatown/ID; 30 ft no-parking sign covered by `NOPARK` | Agrees |
| P3 | NE 41ST ST, 12TH AVE NE to BROOKLYN AVE NE, S (39334) | Paid Mon–Sat 08–20, $1 / $5.50 / $3, limit 120; `NOPARK` 9 | Pay 8–8 exc Sun/hol, "2 HOURS MAX NO TIME LIMIT AFTER 5PM"; rates match U District Core; no-parking signs covered | Agrees. The limit is conservative after 17:00. |
| R1 | 1ST AVE N, BLAINE ST to HOWE ST, E (24074), zone 26 | Zone polygon "Monday – Saturday 7 AM to 7 PM"; `NOPARK` 0 | Three "2 H 7A-7P EXC SUN-SAT-HOL, EXC BY ZN 26 PERMIT" (structured days 1–5), plus a no-parking arrow | **Contradiction: permit days, and no parking** |
| R2 | E LAKE WASHINGTON BLVD, MONTLAKE BLVD E to 24TH AVE E, S (59614), zone 1 | Zone polygon Mon–Sat 07–18 | "2 H 8A-5P EXC SAT-SUN-HOL" and "NO PARKING (VARIABLE DATES & TIMES) EXC BY ZN 1 PERMIT" | **Contradiction: permit hours, and event permit-only periods** |
| R3 | E HOWELL ST, 12TH AVE to 13TH AVE, S (36770), zone 4 | Zone polygon Mon–Sat 07–18; `NOPARK` 0 | "2 H PARKING 7A-6P EXC SUN-HOL, EXC BY ZONE 4 PERMIT" agrees; R7-NPL no-parking arrow at 289 ft (side ends 309 ft) | **Contradiction: no parking** |
| N1 | 6TH AVE, JAMES ST to CHERRY ST, NE (7986) | No parking | Two "NO PARKING ANYTIME" | Agrees |
| N2 | CONVENTION PL, UNION ST to PIKE ST, E (55058) | No parking; `BUS` 0 | "NO PARKING ANYTIME" and four "METRO BUS ONLY 24 HOURS EVERYDAY" | **Contradiction under the rule: bus-only not carried.** Not a free-parking hazard, because the claim already restricts. |
| N3 | MERCER ST, TERRY AVE N to BOREN AVE N, N (11781) | No parking | No record in either sign layer | **Unverified:** no independent signal |

Result: 5 agree, 6 contradict and 1 is unverified. That is not zero contradictions, so the subset fails criterion 7.

The 6 are counted under the pre-registered rule, which is broader than criterion 7's listed fields:

- **R1 and R2** fall directly on a listed criterion 7 field: permit hours.
- **T2 and R3** (no parking inside a side claimed free or permit) and **P1** (loading-only portion) are safety-relevant under ADR-0001 and the rule, but are not one of the four listed fields.
- **N2** (bus-only on a no-parking claim) is a contradiction under the rule only. It does not mislead a driver.

Two listed-field contradictions are enough to fail criterion 7. The failures are not edge cases. T2 and R3 do not hinge on how to read an arrow: the record says zero no-parking spaces, but no-parking signs stand inside the recorded side extent. P1 and R2 fail on rules the record has no field for at all.

### Whole-population audit: why shrinking does not help

[`stratum-sign-audit.json`](../../artifacts/issue-24-seattle-review-2026-10-23/stratum-sign-audit.json) counts sign categories on every side in strata T and P, not on a sample. It uses Parking Signs layer 0 only, with no status filter. Layer 0 has no status field and holds about 450 more records than the in-service text layer 4, so a few counted signs may be retired. The scale of the counts makes the conclusion robust to that:

- **T, 499 sides with `NOPARK`=`TOTAL_NOPARK`=0:** 299 have no-parking (PNP) signs, 23 disabled-parking, 4 paid-regulatory, 4 no-stopping and 1 peak tow-away. Every side has a time-limit sign.
- **P, 401 sides with `NOSTOP`=`ZONE`=`TOTAL_ZONES`=`BUS`=0 and null `LOAD_`:** 97 have no-stopping signs, 54 special zones (charter, taxi, carshare and similar), 13 passenger-load, 11 load/unload, 11 school, 8 peak tow-away, 4 bus-zone, 4 disabled, 3 RPZ and 3 commercial-load.
- `LOAD_` is null on all 47,926 Blockface rows (`LOAD_ IS NOT NULL` → 0, [`raw/count-Blockface-1-LOAD_notnull.json`](../../artifacts/issue-24-seattle-review-2026-10-23/raw/count-Blockface-1-LOAD_notnull.json)), while the sign inventory holds 3,300 load/unload signs.

So Blockface's competing-use fields cannot carry a safe subset definition. The only way to remove these sides is to filter on the sign inventory. The spot check would then be graded by the same layer that chose the sample, and no third official signal is available: no current geocoded citation feed, and ADR-0004 rules out new field evidence. For permit zones, two of three random zones (1 and 26) disagree with their polygon hours. That is on top of the five zones already excluded (14, 22 and 25 conflicting, 13 split, 21 alternative hours), so 7 of 35 zones now have conflicting, split or alternative hours. Zone-by-zone exclusion would still leave the no-parking-extent failure seen at R3.

Curb Space Categories (`raw/curbspace-21773.json`) does model the P1 loading zones (`PS-LUL`, 30 or 120 min) and the no-parking clearances by linear extent. It has **no rows** for the unpaid time-limited side T2 (`raw/curbspace-25929.json`). It is a lead for a future paid-area, space-level subset (#25), not for free parking. It also labels load/unload spaces `CATEGORY='PAID'`, so `SPACETYPE`, not `CATEGORY`, would have to drive any claim.

## Per-source verdicts (2026-10-23)

C1 and C6 pass for every row (see above). "Pending" names what is missing; "rejected" names the failed criterion.

| Source | C2 | C3 | C4 | C5 | C7 | Verdict |
|---|---|---|---|---|---|---|
| SDOT Blockface (E1) | pass | block side, but competing-use extents not represented | `LOAD_` empty; peak, loading and event rules not carried | pass | **fail**: 6 of 12 contradictions in the pre-registered subset; population audit above | **pending** (C3/C4/C7). Whole-side free from category rejected. |
| Parking Signs / Parking Features 4 (E3) | pass | points with distance; arrow and extent semantics undocumented | split, variable-date and holiday codes need an official dictionary; none found | pass | not run as the rule source: only Blockface, itself failing, could grade it | **pending** (C3/C4/C7) |
| RPZ zones 4 (E4) | pass | polygon | `INEFFECT` disagrees with signs in zones 1, 26 (fresh), 14, 22, 25; 13 and 21 split or alternative | pass | **fail**: R1, R2 | **pending** (C4/C7) |
| RPZ signed blocks 0 | pass | 72,188 rows against 47,926 sides, unexplained | aggregate Blockface-style fields | pass | not run: same aggregate defect as Blockface | **pending** (C3/C4/C7) |
| RPZ eligibility 1 | pass | resident eligibility lines | eligibility, not curb rules | pass | n/a | **rejected** as a permission source (C3/C4); supporting context only |
| RPZ game days 3 | pass | 2 polygons | needs an official event calendar | pass | only 2 records; ten places impossible | **pending** (C4/C7) |
| SDOT Pay Stations (E2) | pass | equipment point, not a curb extent | rate bands match; prohibitions not in the feed | pass | rates match published table at P1–P3; P1 loading not in feed | **pending** for paid-only (C3/C7); **rejected** for after-hours free (E2 boundary) |
| Temporary No Parking 0/1/2 (E5) | pass | curb polylines plus reservation and space keys | scheduled vs actual vs custom-time semantics unresolved | pass | not run this session; no independent official schedule signal identified | **pending** (C4/C7). Override-only, never free. |
| Temporary No Parking Unpaid 10 (E5) | pass | points, not block-side extents | daily fields, posting unverified | pass | not run | **pending** (C3/C4/C7) |
| Curb Space Categories 6 / Paid Area Curb Spaces 0 | pass | linear spaces, paid areas only | type and limit, not full schedule; loading labelled PAID | pass | not run as a subset; probe above | **pending**, a lead for #25 |
| Symbology (Active) 0 / Reserve (Active) 0 | pass | as above | as above | data 2024-05 / 2024-03, over 24 months | no fresh old-data re-check | **pending** (C5/C7) |
| Peak Hour Restrictions 3, Transit Layover 0 | pass | linear extents | split and shared-use windows | pass | not run | **pending** as restriction supplements; **rejected** as free evidence |
| Parking Categories 0, Parking Features 2 | pass | duplicate Blockface views | as Blockface | pass | as Blockface | **pending**, same defects as Blockface |
| Parking Tiers 0 | pass | payment-area polygons, not curbs | rate windows only | pass | not run | **rejected** as permission (C3); paid context only |
| Public Garages and Lots 1 / Parking Features 0 (E6) | pass | address points | hours and rates null in samples (2026-10-21) | pass | not run | **pending** (C3/C4/C7) |
| Driveways/Lots 10, Dissolved 11, Parcels 1 | pass | land cover or parcels | no parking rules | over 24 months | n/a | **rejected**: not an evidence type for rules (C3/C4) |
| Municipal code / 72-hour (E7) | HTML guidance, no rule records | jurisdiction only | [SDOT parking-signs page](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/parking-regulations/parking-signs) (HTTP 200, 2026-10-23T19:19:13Z) caps RPZ and time-limited parking at the posted limit or 72 hours, alongside unsigned statutory restrictions; not signs-only exceptions | no edit date | n/a | **rejected** for E7 (C3/C4). Municode text not re-extracted. |
| Socrata signals (six above) | pass | — | — | as listed | — | **rejected** as Parking Rule evidence (signal-only type) |
| King County Metro / Sound Transit pages (E6) | HTML only, no stable record format | facility, not entrance or stall | [Metro directory](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations) and [Sound Transit parking](https://www.soundtransit.org/ride-with-us/parking) (both HTTP 200, 2026-10-23T19:19:14Z) list permit types and fees (e.g. Northgate $60 monthly, $6 one-day), not normalised schedules | no edit date | not run | **pending** (C2/C3/C4/C5/C7) |

## Intended `evidence_sources.approval_state` for a future release PR

None changes to `approved`. If Seattle rows are created, the values are:

- `pending`: Blockface, Parking Signs, Parking Features 4, RPZ zones 4, RPZ signed blocks 0, RPZ game days 3, Pay Stations (paid-only use), TNP 0/1/2, TNP Unpaid 10, Curb Space Categories 6, Paid Area Curb Spaces 0, Peak 3, Transit Layover 0, Public Garages and Lots 1.
- `rejected`: RPZ eligibility 1 (as permission), Parking Tiers 0 (as permission), Driveways/Lots/Parcels, E7 code default, all signal datasets.

No `coverage_areas` row and no `subset_geom` is proposed, and no city-page sentence is proposed beyond "not covered".

## Unknown areas and why

- **All Seattle streets stay Unknown.** No source passed all seven criteria, and the one subset tested failed criterion 7.
- **Time-limited and unrestricted sides:** Blockface does not carry signed no-parking, disabled and no-stopping portions (60% of the cleanest time-limited sides have no-parking signs). Unrestricted sides were not offered as free, because absence of a recorded restriction never establishes permission.
- **Metered sides:** loading, special-zone and no-stopping portions are not in Blockface (`LOAD_` empty). After-hours free is also unproven, since null Sunday or evening bands are not a rule.
- **RPZ zones:** 7 of 35 zones have polygon hours that conflict with signs, or that are split or alternative. The other 28 are not individually verified, and permit-only event periods are not in the polygons.
- **Temporary restrictions:** no independent schedule signal, so they are not synced and not caveated at runtime.
- **Lots and park-and-rides:** no import-ready E6 source.

## Follow-ups

1. **#25: test a space-level paid subset.** Use Curb Space Categories `SPACETYPE` and `BLOCK_ST`/`BLOCK_END` (not Blockface counts) for paid areas, with signs as the independent check. Pre-register the definition and seed. It can at best establish `PAID` at space level; it does not reach unpaid streets.
2. **#26: zone-by-zone RPZ audit of all 35 zones** against the sign **text** in Parking Features layer 4, not layer 0's structured days (at R2, layer 0 gives days 1–6 for R8-2HZ1A while its text says Mon–Fri), before any E4 subset. Treat 1, 13, 14, 21, 22, 25 and 26 as Unknown until each is reconciled.
3. **Free-parking path:** no current Seattle evidence supports any free claim. A free subset needs an E3 interpretation with an official arrow and extent dictionary and a third independent signal. Neither was found in public sources (ADR-0004: no outreach). That stays a recorded gap, not a task to request data.
4. **#27:** unchanged. E5 still lacks an independent schedule signal.

## Validation

- Link check on this file and `seattle.md`. Every relative artifact link resolves, and every cited URL was retrieved this session (timestamps above).
- `git diff --stat origin/dev` shows only `docs/sources/seattle.md`, this file and the new artifact directory.
- `SHA256SUMS` in the artifact directory, verified with `shasum -a 256 -c`.
- No application, DB or preview rungs apply to this docs/evidence change. No production or Neon access was used.
