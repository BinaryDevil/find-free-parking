# Seattle independent source reassessment — 2026-10-21

Refs [#24](https://github.com/BinaryDevil/find-free-parking/issues/24). Review base `fc5612d12b2c5ea47797038c09961d46598fcba6`. Reviewer is independent of the inventory author. This is a dated reviewer evidence packet, not source approval or a claim that #24 is complete. Seattle Coverage remains **none**. No database inspection/write, import, source activation, deployment, outreach, or dev/main merge occurred.

The owner-amended [ADR-0002](../adr/0002-evidence-source-policy.md) criterion 6 is applied: all 27 official GIS layer metadata/count/sample endpoints below were retrieved without authentication, payment or access-control bypass. Their exact service items report public access. Any shown licence/disclaimer and attribution are retained in the linked JSON; missing licence text is not a pending/rejection reason. Older rights-only objections are superseded. All other criteria remain required.

## Fresh retrieval register

Every linked file records the endpoint, complete field list/types, count, source edit timestamps, geometry type, service item owner/public state/terms and safe rule-field sample. Samples omit private applicant/contact values. A source export edit timestamp is not proof of a recent physical sign inspection. `dataLastEditDate` is shown separately where it differs. All retrievals were made by this reviewer, not copied from prior author evidence.

| Official layer / evidence | Rows | Last edit UTC | Data edit UTC if different | C1 authority | C2 format / ID evidence | C6 public |
|---|---:|---|---|---|---|---|
| [Blockface-1](../../artifacts/issue-24-seattle-public-review-2026-10-21/Blockface-1.json) | 47,926 | 2026-10-21T13:55:28.247000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID, RPZ_ZONE | pass |
| [Curb_Space_Categories-6](../../artifacts/issue-24-seattle-public-review-2026-10-21/Curb_Space_Categories-6.json) | 40,539 | 2026-10-21T13:18:00.650000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Curb_Space_Categories_with_Symbology_(Active)-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Curb_Space_Categories_with_Symbology_(Active)-0.json) | 40,539 | 2026-10-21T13:18:00.650000Z | 2024-05-03T13:40:36.647000Z | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Curb_Space_Reserve_(Active)-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Curb_Space_Reserve_(Active)-0.json) | 12,632 | 2024-03-21T16:18:50.944000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Curbspace_Transit_Layover-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Curbspace_Transit_Layover-0.json) | 282 | 2026-10-21T12:54:09.980000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Driveways_and_Parking_Lots-10](../../artifacts/issue-24-seattle-public-review-2026-10-21/Driveways_and_Parking_Lots-10.json) | 141,161 | 2024-03-07T19:55:33.230000Z | same | CityLight_SeattleCityGIS | JSON; OBJECTID | pass |
| [Driveways_and_Parking_Lots_Dissolved-11](../../artifacts/issue-24-seattle-public-review-2026-10-21/Driveways_and_Parking_Lots_Dissolved-11.json) | 1 | 2024-03-07T21:38:49.842000Z | 2024-03-07T21:33:06.909000Z | CityLight_SeattleCityGIS | JSON; OBJECTID | pass |
| [Paid_Area_Curb_Spaces-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Paid_Area_Curb_Spaces-0.json) | 40,539 | 2026-10-21T13:25:43.057000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Parcels_Within_10ft_of_Driveways_and_Parkings_Lots-1](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parcels_Within_10ft_of_Driveways_and_Parkings_Lots-1.json) | 140,023 | 2024-03-07T19:17:34.905000Z | same | CityLight_SeattleCityGIS | JSON; OBJECTID | pass |
| [Parking_Categories-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Categories-0.json) | 46,234 | 2026-10-21T13:21:59.316000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID, RPZ_ZONE | pass |
| [Parking_Features-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Features-0.json) | 700 | 2026-10-21T10:17:47.123000Z | same | Transportation_SeattleCityGIS | JSON; OBJECTID | pass |
| [Parking_Features-2](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Features-2.json) | 46,234 | 2026-10-21T10:21:31.683000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, RPZ_ZONE | pass |
| [Parking_Features-3](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Features-3.json) | 83,572 | 2026-10-21T10:24:17.935000Z | same | Transportation_SeattleCityGIS | JSON; ELEMENT_KEY | pass |
| [Parking_Features-4](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Features-4.json) | 97,679 | 2026-10-21T10:27:23.470000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID | pass |
| [Parking_Signs-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Signs-0.json) | 98,124 | 2026-10-21T13:15:15.365000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID, COMPKEY | pass |
| [Parking_Tiers-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Parking_Tiers-0.json) | 37 | 2026-10-21T13:23:17.738000Z | same | Transportation_SeattleCityGIS | JSON; OBJECTID | pass |
| [Peak_Hour_Parking_Restrictions-3](../../artifacts/issue-24-seattle-public-review-2026-10-21/Peak_Hour_Parking_Restrictions-3.json) | 492 | 2026-10-19T17:20:47.750000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY | pass |
| [Public_Garages_and_Parking_Lots-1](../../artifacts/issue-24-seattle-public-review-2026-10-21/Public_Garages_and_Parking_Lots-1.json) | 700 | 2026-10-19T17:22:07.517000Z | same | Transportation_SeattleCityGIS | JSON; BUSLIC_ID | pass |
| [Restricted_Parking_Zone_Areas-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Restricted_Parking_Zone_Areas-0.json) | 72,188 | 2026-10-21T13:06:43.459000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID, RPZ_ZONE | pass |
| [Restricted_Parking_Zone_Areas-1](../../artifacts/issue-24-seattle-public-review-2026-10-21/Restricted_Parking_Zone_Areas-1.json) | 4,464 | 2026-10-21T13:09:04.734000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID | pass |
| [Restricted_Parking_Zone_Areas-3](../../artifacts/issue-24-seattle-public-review-2026-10-21/Restricted_Parking_Zone_Areas-3.json) | 2 | 2026-10-21T13:10:18.787000Z | same | Transportation_SeattleCityGIS | JSON; RPZ_ZONE | pass |
| [Restricted_Parking_Zone_Areas-4](../../artifacts/issue-24-seattle-public-review-2026-10-21/Restricted_Parking_Zone_Areas-4.json) | 35 | 2026-10-21T13:11:24.279000Z | same | Transportation_SeattleCityGIS | JSON; RPZ_ZONE | pass |
| [SDOT_Pay_Stations-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/SDOT_Pay_Stations-0.json) | 1,631 | 2026-10-21T13:35:37.955000Z | same | Transportation_SeattleCityGIS | JSON; ELMNTKEY, UNITID, COMPKEY | pass |
| [Temporary_No_Parking_1-0](../../artifacts/issue-24-seattle-public-review-2026-10-21/Temporary_No_Parking_1-0.json) | 844 | 2026-10-21T15:51:44.528000Z | same | Transportation_SeattleCityGIS | JSON; ELEMENT_KEY, TNP_RECORD_ID, CURBSPACE_NUMBER | pass |
| [Temporary_No_Parking_1-1](../../artifacts/issue-24-seattle-public-review-2026-10-21/Temporary_No_Parking_1-1.json) | 2,336 | 2026-10-21T15:51:44.951000Z | same | Transportation_SeattleCityGIS | JSON; ELEMENT_KEY, TNP_RECORD_ID, CURBSPACE_NUMBER | pass |
| [Temporary_No_Parking_1-2](../../artifacts/issue-24-seattle-public-review-2026-10-21/Temporary_No_Parking_1-2.json) | 83,621 | 2026-10-21T15:51:56.099000Z | same | Transportation_SeattleCityGIS | JSON; ELEMENT_KEY, TNP_RECORD_ID, CURBSPACE_NUMBER | pass |
| [Temporary_No_Parking_Unpaid-10](../../artifacts/issue-24-seattle-public-review-2026-10-21/Temporary_No_Parking_Unpaid-10.json) | 1,161 | 2026-10-21T15:42:35.805000Z | same | Transportation_SeattleCityGIS | JSON; OBJECTID | pass |

C2 in this register establishes a queryable format and available identities/geometry, not that nightly export OBJECTIDs are stable provenance. Adapters must use semantic identifiers and/or validated geometry. E.g. temporary rules need reservation plus curb-space identity, RPZ semantic zone/subarea identity, and signs asset identity. Do not use changing export OBJECTIDs as permanent rule keys.

All local selected-time evaluation must use `America/Los_Angeles`. Saved ArcGIS date-field time-reference metadata governs epoch fields; Blockface minute bands and sign HHMM fields are different formats. No undocumented endpoint inclusivity, day-code mapping, holiday/event calendar or custom-time interpretation was filled by assumption.

## Per-source remaining criteria and verdicts

For every source in the register, C1 and C6 pass as above; C2 field/identity evidence is in its artifact. C5 has a source timestamp; old data remains pending fresh successful independent re-review, not approved merely because retrieved today. The following table states C3 precision, C4 schedule and C7 safety-check findings for each family and its duplicate views. “Ten starts” below means ten distinct candidate locations were retrieved and cross-layer comparisons retained; it does **not** mean ten passing location/schedule/permission checks. No source reaches all seven criteria.

| Candidate(s) | C3 location precision | C4 schedule semantics | C5 freshness | C7 independent official comparison / unresolved safety | Verdict |
|---|---|---|---|---|---|
| Blockface / Parking Categories / Parking Features 2 | Named block sides; CSM-managed dimensions differ from approximate non-CSM geometry; exact mixed curb portions not established | Aggregate category/rates omit spatial assignment of competing signs and statutory exclusions | Current export timestamp, individual rule observation not established | Ten starts each, plus 20 targeted permit/meter/time-limit/no-parking cases; Unrestricted plus disabled/arrow prohibitions recur | Pending as rule evidence; reject whole-side free from summary |
| Parking Signs / Parking Features 4 | Asset points/distances; arrows and full applicable extent need reconciliation | Text supplements structured HHMM/day codes; nulls, split windows, event and holiday cases remain | Current export, not completeness/current-posting proof | Ten starts per layer plus targeted sample; two views of sign asset system are not independent physical observations; RPZ contradictions persist | Pending E3; no complete E3 claim |
| RPZ signed blocks 0 | 72,188 polyline rows now present; collection contains block summaries and needs correct signed-curb interpretation | Uses Blockface-style aggregate fields; no evidence that every row is an independently complete signed visitor rule | Current export | Ten distinct sides joined to signs/Blockface; populated layer does not resolve zone/sign contradictions or allocations | Pending; no longer “empty” |
| RPZ eligibility 1 | Residence eligibility lines, not proof of signed curb | Eligibility INEFFECT is not permission on every line | Current export | Ten distinct sides joined; eligibility cannot substitute for actual posted visitor restrictions | Excluded as permission source; retain supporting eligibility only |
| RPZ zones 4 | Zone polygons available; not universal signed curb | Zone 21 explicitly alternatives; zones 14/22 disagree with sign hours; zone 25 text/structured mismatch | Current export | Ten named zone/curb checks freshly rerun below, including permit-only and four-hour visitor cases; not zero contradictions | Pending |
| RPZ game-day zones 3 | Two polygons; geometry alone insufficient | Husky Football Game Days needs authoritative dates and actual applicable signed hours | Current export | Two rows, not ten independent places; no complete event calendar/sign extent cross-check | Pending |
| Pay stations | Equipment point plus curb key; complete serving curb allocation unresolved | Rates and minute bands exist, missing complete same-feed prohibitions/time limits; null evening/Sunday cannot mean free | Current export | Ten fresh station rates agree with independent official rate publication; ten curb sign joins retained; precise active restriction coverage not established | Pending paid-only; rejected standalone after-hours free under E2 |
| TNP current 0 / past-current-future 1 / all 2 / Parking Features 3 | Curb polylines and reservation/space keys; placement join retained | Scheduled versus actual bounds and custom daily periods unresolved; view membership is not selected-instant truth | Current export plus modification fields | Ten distinct curb starts per view joined to signs/Blockface; these static signs do not independently establish temporary daily schedule/posting | Pending E5; absence never free |
| TNP unpaid 10 | Point plus descriptions, not validated block-side extents | Daily AM/PM/weekend/full-day fields exist; requested bounds/actual posting not independently settled | Current export plus modification fields | Ten fresh permitted-address/schedule records retained, no ten independently verified extent/schedule/posting matches | Pending C3/C4/C7 |
| Curb Space Categories 6 / Paid Area Curb Spaces 0 | Individual linear space fields help partition; not reconciled to all arrows/exclusions | Space type/time-limit is not complete schedule | Current export | Ten distinct curb starts per view against all returned sign text; mixed payment/loading/exclusion restrictions remain | Pending as supplement; rejected standalone complete rules |
| Symbology active 0 / Reserve active 0 | Same curb-space family; exact assignment unverified | No complete standalone schedule | Symbology data May 2024; Reserve March 2024, both over 24 months | Ten distinct curb starts each freshly joined; not successful zero-contradiction old-data re-review | Excluded standalone; old-data C5/C7 unresolved |
| Peak hour restrictions 3 | Block/side plus extents, not complete curb permission | Split peak text exists; exceptions and competing restrictions need exact reconciliation | Current export | Ten distinct curb comparisons; some matching text, some no exact independent peak corroboration; no source pass | Pending restriction supplement; rejected free evidence |
| Transit layover 0 | Individual linear-space fields help, still shared-use extent resolution | Transit-only windows coexist with pay/loading/permit rules | Current export | Ten fresh distinct sides with signs; Metro-only and shared-use examples remain; no all-applicable-rule pass | Pending restriction supplement; rejected free evidence |
| Parking Tiers 0 | Broad payment-area polygons, not individual curbs | Morning/day/evening rate windows retained; boundaries, exceptions and actual curb applicability unresolved | Current export | 37 rate rows fetched; ten station curb starts provide leads, not ten validated polygon-to-curb safety matches | Pending paid context; rejected standalone permission |
| Public Garages/Lots 1 / Parking Features 0 | Facility address/point; exact public entrance/footprint not validated | Ten lot records have null sampled hours and short-term rates; duplicate view only name/address | Export dates exist but null individual DATETIME in sample | Ten facility samples each, no ten current independent operator schedule/permission checks; see operator section | Excluded as import-ready E6 rule source |
| Driveways/Lots 10 / dissolved 11 / parcels-within-10ft 1 | Land cover/dissolved geometry/parcel relation, not actual parking entitlement or public entrances | No parking schedules or permission fields | March 2024; over 24 months | No fabricated ten-place permission checks; dissolved layer has one aggregate geometry | Rejected context only; fails evidence-type boundary/C3/C4, old-data re-review not completed |

## Fresh safety comparisons

Artifacts named `*-comparisons.json` retain source records selected by the first ten distinct non-null block keys (up to 2,000 safe projected rows), their Blockface location/side, and every returned Parking Features sign text. The selection is reproducible by saved keys, not claimed representative. `representative-safety-cases.json` adds deliberate payment, permit, time-limit and no-parking safety cases. Duplicated exports are identified as such; same-system field agreement alone is not approval. No geometry-based exact-extent verification was completed.

New current examples, beyond relying on old author notes:

- Blockface 51530 still says Unrestricted Parking while fuller signs include disabled-permit/tow-away and an arrow prohibition; 69510 has an arrow prohibition. This contradicts treating the whole block as free; it does not prove every curb portion prohibited.
- Peak curb 25701 has independent text for split 06–09 and 15–19 weekday tow-away windows plus payment and bus uses. Curb 6181 has anytime-prohibition text but no exact sampled 16–18 corroboration; 1610 lacks interpretable peak-hour text.
- Layover curb 31893 combines paid periods, Metro-only 14–19 weekday use, anytime prohibitions and no-stopping. Curb 56690 includes Metro split windows and a permit-only food-vehicle interval. An after-hours or pay-category inference would omit applicable restrictions.

### Ten RPZ zone/curb checks

Fresh `rpz-targeted-zones.json` contains all 35 polygon summaries, structured sign fields and fuller text for these ten places, all retrieved by this reviewer. Curbs correspond to the named places in inventory table B; keys below identify exact public GIS records.

| Zone / curb ELMNTKEY | Current independent sign/polygon comparison | Result |
|---|---|---|
| 12 / 10329 | Two-hour 07–18 weekdays agrees with polygon; disabled-only sign also present | Matching visitor hours, full curb extent pending |
| 25 / 81510 | Pay text 09–16; polygon 09–16, structured sign hours differ (08–18); disabled allocation also present | Unresolved field/extent interpretation |
| 14 / 26613 | Polygon weekday 07–18 plus evening; current zone sign text/structured 07–16 | Safety contradiction remains; Unknown |
| 35 / 67758 | Text two-hour 07–18 except Sunday/holiday, matching broad polygon; no-parking signs coexist | Matching visitor hours, extent pending |
| 19 / 1625 | Text two-hour weekday 07–19 agrees with polygon | Extent/other rules pending |
| 13 / 48081 | Separate visitor/permit-only and Metro-only signs; polygon daily 07–midnight is an aggregate | Resolve each curb portion and split period |
| 28 / 47674 | Text four-hour 07–18 weekdays agrees with polygon, prohibition also present | Four hours, not blanket two-hour allowance; extent pending |
| 21 / 14638 | Text two-hour 07–18 except Sunday/holiday is one polygon alternative | Select signed subset, never blanket zone hours |
| 32 / 59878 | Text two-hour 07–20 except Sunday/holiday agrees broadly; no-stopping also present | Extent/structured nulls pending |
| 22 / 32401 | Polygon/main structured 07–16; text two-hour 07–18 weekdays, plus 30-foot prohibition | Safety contradiction remains; Unknown |

These are ten fresh checks, **not ten passes**. No disagreement is silently resolved by choosing whichever field permits parking.

### Ten fresh station rates against a separate official publication

The [SDOT rate table](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/paid-parking-information/street-parking-rates) independently matches the sampled current weekday numeric rates. Blank published evening values remain unknown permission. This passes the numeric-rate comparison only; it does not pass C3/C4/C7 for safe paid/free curb use. Raw station values and sign joins are retained.

| Station / curb | Published area | Morning / afternoon / evening USD/hour |
|---|---|---|
| 527636 / 77549 | Commercial Core - Financial | 2 / 1.5 / 1 |
| 283368 / 91546 | Uptown | 1 / 1.5 / 1.5 |
| 281950 / 86057 | Green Lake | 1 / 4 / 3.5 |
| 286806 / 36113 | Belltown - North | 1 / 1.5 / 1.5 |
| 279727 / 48450 | Ballard - Core | 1 / 6.5 / 7 |
| 527876 / 1002 | Pioneer Square - Core | 1 / 6.5 / not published |
| 280830 / 88546 | Chinatown/ID | 1 / 5 / 5.5 |
| 668603 / 46917 | Pike-Pine | 1 / 5 / 8 |
| 527684 / 36098 | Commercial Core - Waterfront | 1 / 8 / 5.5 |
| 526133 / 57898 | University District - Edge | 1 / 1 / not published |

## Operator, legal and signal candidates

The [King County parking directory](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations), [Northgate project](https://kingcounty.gov/en/dept/metro/programs-and-projects/transit-oriented-communities/northgate), [Sound Transit Northgate A](https://www.soundtransit.org/ride-with-us/parking/parking-locations/northgate-park-ride-northgate-station-garage), and [Sound Transit parking rules](https://www.soundtransit.org/ride-with-us/parking) were freshly retrieved publicly. C1/C6 pass. HTML with facility identity is machine-readable in principle, but a validated stable record format, precise public entrance/level/stall assignment (C2/C3), normalized complete schedules (C4), rule update signal (C5), and ten independent complete safety matches per source (C7) are not established. No missing licence objection is retained.

Northgate A has 443 spaces and an operator page with up-to-24-hour limit and reserved permit categories. The Metro directory distinguishes free B1–B4 from the paid retail roof; that does not establish exact free stall allocation or eliminate permits. Northgate C still needs arrival-aware treatment: the directory limits the orange P2 transit preference to weekday morning arrivals, with fees possible after the complimentary period for later/weekend entry. Northgate D’s project page says its northern section is permanently closed and names the southern entrance. The project’s abbreviated C summary omits the directory’s later-arrival qualification. Neither summary may be normalized into unconditional free permission. These are narrowed research leads, not an approved E6 subset.

The historical [Diamond public JSON](https://www.diamondparking.com/wp-content/plugins/diamond-parking/assets/data.json) returned HTTP 403 on this reviewer’s direct unauthenticated request. No bypass attempted; present public availability of this particular feed was not reconfirmed. Old ten-address/monthly-price matches are not fresh checks. The ten fresh city-directory samples have null weekday/weekend hours, hourly/all-day rates, operator URL and individual rule timestamp. No operator-source approval is defensible from those rows.

[SDOT Can I Park Here?](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/parking-regulations/parking-signs) was independently re-read. Its driveway, hydrant, unmarked-crosswalk, loading and vehicle restrictions show why a 72-hour maximum cannot establish a signs-only-exceptions E7 default. C1/C6 pass; legal section identity is available context, but location-specific permission and complete schedule (C3/C4), current codification history (C5), and ten qualifying permission checks (C7) are unestablished. The dynamic Municode legal text was not freshly extracted; no fresh codification claim is made. Rejected for E7 permission, not for rights.

Signal metadata and aggregate-only counts were re-fetched without retrieving individual events or personal citation/request records. C1/C2/C6 public metadata pass; C3/C4 cannot establish current block-side parking permission, C5 is recorded below, and no ten-place permission sample can change the explicit signal-only evidence boundary. All remain **rejected as Parking Rule evidence**, with no Coverage.

| Signal | Fresh count | rowsUpdatedAt UTC | Shown licence |
|---|---:|---|---|
| [72hr Parking Ordinance Violations](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-74ix-6xdj.json) | 518838 | 2026-10-21T15:44:11Z | PUBLIC_DOMAIN |
| [Annual Parking Study Data](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-7jzm-ucez.json) | 167799 | 2019-11-26T22:30:42Z | PUBLIC_DOMAIN |
| [Paid Parking Transaction Data](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-gg89-k5p6.json) | 156519 | 2026-10-21T14:11:34Z | PUBLIC_DOMAIN |
| [Paid Parking (Last 48 Hours)](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-hiyf-7edq.json) | 7133188 | 2026-10-21T15:47:54Z | PUBLIC_DOMAIN |
| [Seattle Vehicle Infractions](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-jxcr-rhfz.json) | no tabular count | 2019-06-12T21:13:46Z | PUBLIC_DOMAIN |
| [2026 Paid Parking Occupancy](../../artifacts/issue-24-seattle-public-review-2026-10-21/signal-q2e4-e7e5.json) | 73770121 | 2026-04-07T16:57:12Z | PUBLIC_DOMAIN |

## Approval and actionable frontier

No source is approved. Intended R4 `evidence_sources.approval_state` changes from this review: **none**. Do not record a two-agent approval line: prior author inventory is draft/pending, and no current written author agreement establishes an approved source/subset after all seven criteria. Existing fixtures or synthetic adapter tests do not fill independent real-source evidence gaps. #24 remains open, including Vancouver work outside this packet.

1. **#25: demonstrate one precise managed curb subset end to end before widening.** Use current individual-space geometry and sign distance/arrow assignment, not whole Blockface categories. Carry payment, loading, transit, disabled, Sunday time-limit, event and statutory exclusion cases. The retained ten station keys and targeted curbs are concrete public fixtures. A proposed subset must name actual space/curb bounds and all source dependencies, exclude unresolved rows, and obtain ten representative zero-contradiction independent checks. No such completed subset is evidenced here.
2. **#26: use the now-populated signed-block layer as an investigation input.** Validate why its 72,188 rows exceed Blockface’s 47,926 and whether semantic block/side identities duplicate. Pin the zone 14/22 contradictions and zone 25 field conflict as hard Unknown cases. Validate visitor hours and vehicle conditions on signed curb portions; polygon-only restrictions cannot become free outside polygon hours.
3. **#27: separate E5 warning extraction from complete temporary Coverage.** Use reservation-plus-space keys and explicit scheduled/actual/custom-hours semantics; unpaid points remain an extent gap. Static sign joins or issuance do not prove posted temporary dates/times. Obtain independent existing public schedule evidence for ten places or leave the source pending; do not substitute duplicated views.
4. **E6 refinement: narrow transit customer cases before a generic lot importer.** Northgate A/B/D named levels/entrances and C arrival-dependent orange P2 rules have official leads, but C2/C3/C5/C7 and reserved-space conditions remain. A city business directory importer would not solve these. Use only already public evidence; no outreach preparation.

## Validation and limits

This docs/evidence-only change was checked for valid JSON, expected 27-layer completeness, public item identity, absence of selected private contact/applicant values in sample projections, internal links, relative CLAUDE symlink and diff whitespace. Application/DB tests are not needed for this read-only packet under [RETURNING](../RETURNING.md). The review did not verify production, source sync freshness, field-posted signs, a complete event calendar, exact curb geometry partitioning, or ten passing safety locations per source. Those limits remain explicit approval gaps.
