# Seattle No Restriction Found eligibility review (author side), 2026-10-26

Refs [#138](https://github.com/BinaryDevil/find-free-parking/issues/138) (parent [#2](https://github.com/BinaryDevil/find-free-parking/issues/2)). It applies the accepted [ADR-0001 No Restriction Found amendment](../adr/0001-verified-rules-only.md#no-restriction-found-amendment), whose numbered rules are cited below as "rule N". Base `origin/dev` at `c8ddbcc`.

This is the **author** review under [ADR-0005](../adr/0005-agent-verified-gates.md). It approves nothing. Every "pass" below is the author's finding and needs an independent reviewer agent's re-check before any role, register or source is approved. No database write, import, source activation, deployment, outreach or merge took place.

## Verdict

**Seattle cannot enable No Restriction Found today, for streets or for lots.** In order of how hard each blocker is to remove:

1. **No temporary-restriction (E5) source is approved** (rule 4, freshness). Temporary No Parking is still pending on C4, because its scheduled, actual and custom-time semantics are unresolved. A city with no approved E5 source for a place type cannot show the label for that type. Lots have no E5 source at all.
2. **Measurement (rule 5): no signal both tests the main failure mode and could plausibly pass.** The only held-out source that tests the main failure mode is the SDOT sign inventory. A pre-registered probe on that inventory predicts a hard-block miss: in-service no-parking or tow-away signs stand on 25 of 60 sides that Blockface alone would label (42%, exact 95% CI 29–55%). That is still 11 of 60 if 30 ft clearance signs are set aside. The only other source that passes the letter of rule 5 is King County Metro's stop layer. It would measure bus stops only.
3. **Parking layer (rule 2): no layer is eligible.** SDOT Blockface fails ADR-0002 C4 for every No Restriction Found role, including the narrowest one, "Unrestricted Parking" sides. Its only documented field, `PARKING_CATEGORY`, does not rule out partial time limits or partial no-parking on those sides. The count fields that would rule them out are undocumented, and an undocumented zero cannot ground a grant. No E3 or E6 layer passes either.
4. **Restriction register (rule 3): drafted below, not approved.** No source records three categories as parking restrictions: vehicle class, street cleaning, and events with dates. On unpaid streets, loading, disabled-only and school zones are recorded only as sign points with no published extent. No stopping, tow-away, partial no-parking and peak hour are partial: where Blockface misses them, only sign points record them.
5. **The owner has not set the maximum acceptable miss bound** (rule 5). That is an owner decision and needs no action from this ticket.

The three questions in #138:

| # | Question | Author answer (2026-10-26) |
|---|---|---|
| 1 | Does a Seattle E1, E3 or E6 layer pass C1–6 in full for the parking-layer role? | **No.** **Blockface (E1): fail C4 for every role.** For "Unrestricted Parking" sides (the narrowest role), the documented category allows partial time limits and partial no-parking, and the count fields that would exclude them are undocumented. For time-limited sides, hours are null on 1,468 of 1,486. **Parking Signs (E3): fail** (C3/C4). **Metro and Sound Transit lots (E6): fail** (C3/C4, reused 2026-10-24 evidence). |
| 2 | What is Seattle's restriction register? | Drafted below: 26 official sources from SDOT, SPU and King County Metro, mapped to the 16 rule 3 categories. Three categories have no restriction source. Three more (loading, disabled-only, school) are recorded on unpaid streets only as sign points. Four (no stopping, tow-away, no parking, peak hour) are partial. |
| 3 | Can any source serve as the rule 5 measurement signal? | **Sign inventory (hold-out): qualifies on the letter, but predicted to fail** (25/60). **King County Metro stops (hold-out): qualifies on the letter, but tests bus stops only.** Whether that satisfies rule 5's intent is an open question for the reviewer and owner. No independent (non-input) official signal exists. |

## Evidence

All files are in [`artifacts/issue-138-seattle-nrf-2026-10-26/`](../../artifacts/issue-138-seattle-nrf-2026-10-26/), with `SHA256SUMS`. Every request is listed in [`retrievals.tsv`](../../artifacts/issue-138-seattle-nrf-2026-10-26/retrievals.tsv) with its UTC time and HTTP status. Retrieval ran from 2026-10-26T23:17:53Z to 23:24:54Z, plus two side-76913 queries at 23:35:42Z added for the review, as anonymous HTTPS GET and POST queries, with no sign-in, payment or access-control bypass.

| File | Contents |
|---|---|
| `raw/meta-*.json`, `raw/count-*.json` | Fresh layer metadata (field lists, edit dates) and counts for every SDOT, SPU and King County layer below |
| `raw/stats-blockface-*.json` | Blockface group-by statistics: category × CSM, time limits, time-limit hours, Unrestricted competing-use fields |
| `raw/stats-signs-category.json` | Parking Signs layer 0 counts by `CATEGORY` and `CATEGORYDESCR` |
| `raw/services-root.json`, `raw/svc-*.json`, `raw/search-*.json`, `raw/socrata-*.json` | The City org's service directory (1,029 services), ArcGIS Online and Socrata catalog searches used for register discovery |
| `raw/item-*.json` | Item records (owner, access, licence text) for Blockface, Parking Signs, Temporary No Parking and King County Metro Stops |
| [`probe-preregistration.json`](../../artifacts/issue-138-seattle-nrf-2026-10-26/probe-preregistration.json) | The sign hold-out feasibility probe, committed in `542db53` at 2026-10-26T23:22:17Z, before any sign record was fetched |
| [`probe-results.json`](../../artifacts/issue-138-seattle-nrf-2026-10-26/probe-results.json), [`probe-breakdown.json`](../../artifacts/issue-138-seattle-nrf-2026-10-26/probe-breakdown.json), `raw/probe-*.json` | Probe output and the descriptive breakdown by sign type |
| `method/` | `fetch.sh`, `fetch2.sh`, `fetch3.sh`, `fetch4.sh`, `fetch5.sh`, `probe_prereg.py`, `probe.py`, `probe_breakdown.py`, `redact.py` |

**Reused, not re-fetched:**
- The Blockface and Street Signs attribute forms (`Blockface_Elements_OD.pdf`, `Street_Signs_OD.pdf`) from [`issue-126-seattle-sign-test-2026-10-24/docs-raw/`](../../artifacts/issue-126-seattle-sign-test-2026-10-24/docs-raw/).
- Item licence texts and the T/P strata population audit from [`issue-24-seattle-review-2026-10-23/`](../../artifacts/issue-24-seattle-review-2026-10-23/).
- All lot evidence from [`issue-125-seattle-lots-2026-10-24/`](../../artifacts/issue-125-seattle-lots-2026-10-24/).

The dates below say which is which.

**Privacy handling.** The Socrata dataset "72hr Parking Ordinance Violations" (`74ix-6xdj`) holds service requests with licence plates and street addresses. A 3-row sample fetched at 23:21:19Z was deleted and is logged as not retained. That request has since been removed from `method/fetch3.sh`, so re-running the scripts fetches only the dataset's metadata. The view metadata files are kept only as `-redacted` copies, with the `cachedContents` top-value blocks removed. The older `issue-24-seattle-review-2026-10-23/raw/signal-74ix-6xdj.json` carried the same block. It has since been redacted on `dev` in #142.

[`method/redact.py`](../../artifacts/issue-138-seattle-nrf-2026-10-26/method/redact.py) then replaced third-party identifiers in 11 catalog and metadata files with `[redacted-third-party]`. It covered personal email addresses, non-agency ArcGIS Online owner accounts, and Socrata owner, author and approval records. Functional agency addresses (for example `DOT_IT_GIS@seattle.gov`) and official org accounts are kept. No conclusion depends on the redacted values. The pre-redaction versions of those 11 files are in this branch's pre-registration commit `542db53`. They were not rewritten, because rewriting would change the pre-registration anchor. A squash merge keeps them out of `dev`.

## 1. Parking layer (rule 2)

Rule 2 needs an E1, E3 or E6 layer that positively records the exact block side or lot. It must pass C1–6 in full: C3 at block side, lot footprint or entrance, and C4 for every limit, hour or eligibility value the label shows or relies on. Criterion 7 is replaced by the rule 5 measurement.

### SDOT Blockface (E1), `Blockface/FeatureServer/1`

| Criterion | Author verdict 2026-10-26 | Evidence |
|---|---|---|
| C1 Authority | pass | Owner `Transportation_SeattleCityGIS`; form contact "SDOT Traffic Management, Parking Controls Group"; item `b35fb25c…` re-fetched |
| C2 Machine-readable, stable | pass | Queryable feature service; 74 fields, unchanged from 2026-10-23 (`meta-Blockface-1.json`); key `ELMNTKEY` (Hansen) |
| C3 Precision | **pass at block side for this role** | One polyline per block side, with `SIDE`, `DISTANCE` and `END_DISTANCE`. In 2026-10-23 C3 was pending because partial competing-use extents (no parking, loading and similar) are not located. Under the amendment those become register restrictions withheld for the **whole** side (rule 4, location uncertain), so the label claims nothing about sub-side extents. |
| C4 Schedule semantics | **fail for every No Restriction Found role** | See below |
| C5 Freshness | pass | `lastEditDate` 2026-10-26T13:53:29Z; form says "Update Frequency: Weekly" |
| C6 Public | pass | Item `access: public`, retrieved anonymously; licence text is the City accuracy disclaimer (recorded 2026-10-23) |

**C4 in detail.** The attribute form (`Blockface_Elements_OD.pdf`, reused from 2026-10-24) and the fresh statistics show:

- `PARKING_CATEGORY` is documented. Its seven values are assigned in priority order, and "Unrestricted Parking" means "if none of the above applies, parking is not restricted by signs". Live counts: 30,727 Unrestricted, 9,646 No Parking Allowed, 2,878 RPZ, 1,692 None, 1,495 Paid, 1,486 Time Limited, 2 Carpool.
- **Time limits are not usable.** The form defines `PARKING_TIME_LIMIT` only as "Parking limit for the paid area in minutes", yet it is set on 1,446 of 1,461 unpaid (CSM `N`) time-limited sides. Its weekday, Saturday and Sunday hour fields are null on 1,468 of 1,486 time-limited sides (`stats-blockface-tl-hours.json`). The 2026-10-23 spot check T1 shows the real limit is "2 HOUR 7AM-6PM EXC SUN-HOL". No field holds holidays. A label that shows a Blockface time limit would show a value without its hours, which C4 makes `UNKNOWN`. **Time Limited sides fail.**
- **Paid, RPZ, No Parking and Carpool sides** are never label candidates: payment, permit and no-parking are withholding restrictions under rule 4. A null paid band is Unknown, never "none found".
- **Unrestricted sides, using documented fields only.** The "No limit recorded" text needs no limit, hour or eligibility value. The only general limit shown is the jurisdiction's 72 hours (rule 4, the stay is too long), which comes from the municipal code, not Blockface. But the label also asserts that official data records no limit and no restriction on the **whole side**, and the only documented field cannot carry that:
  - "Time Limited Parking" is assigned only when "more than half of the block has time limited parking", and "No Parking Allowed" means "no parking allowed on block face". A side with up to half time-limited parking, or with partial no-parking, therefore falls through to "Unrestricted Parking" ("if none of the above applies, parking is not restricted by signs"). The two definitions conflict for such a side, which C4 makes `UNKNOWN`.
  - The count fields that could exclude those portions are `TL_SPACES`, `NOPARK`, `TOTAL_NOPARK`, `NOSTOP`, `BUS`, `CARPOOL_SPACES`, `RPZ_SPACES`, `PAID_SPACES` and `PEAK_HOUR`. None of them is in the attribute form; `ZONE` and `TOTAL_ZONES` are. The documented `LOAD` field (live `LOAD_`) is null on all 47,926 rows (`count-Blockface-1-LOAD_notnull.json`), although the form says non-CSM blocks count load signs.
  - **An undocumented zero cannot ground a grant.** In this role a zero in those fields is what makes a side eligible, so a misread zero grants the label. An earlier draft of this review called these fields "withhold-only"; the independent review of PR #140 rejected that, and this revision accepts the rejection. The probe shows the risk directly. All 25 hit sides have zero `NOPARK` and `TOTAL_NOPARK` under in-service no-parking signs. Side 76913 has a null `PEAK_HOUR` under a live "NO PARKING 6-9AM 3-7PM … TOW-AWAY ZONE" sign, and the Peak Hour layer has no record for it either (`raw/side-76913-peak3.json`, fetched 2026-10-26T23:35:42Z by `method/fetch5.sh`).

**Author verdict:** Blockface **fails C4 for every No Restriction Found role**:
- the Unrestricted role, for the reasons above;
- time-limited sides, because their hours are null;
- paid, RPZ, no-parking and carpool sides, which are withheld anyway.

C1, C2, C3 (block side), C5 and C6 pass. The undocumented count fields can still serve as **register** inputs, because there they only withhold: a non-zero or null value withholds the label. They cannot define the population that receives it. **No Seattle layer is eligible for the parking-layer role.**

### SDOT Parking Signs (E3), `Parking_Signs/FeatureServer/0`, `Parking_Features/FeatureServer/4`, `SDOT_Street_Signs/FeatureServer/1`

| Criterion | Author verdict | Evidence |
|---|---|---|
| C1, C2, C5, C6 | pass | Fresh counts 98,146 / 97,698 / 210,039 (layer 1 holds all SDOT signs, all `CURRENT_STATUS='INSVC'` in the probe sample); edited 2026-10-26 |
| C3 | **fail** for this role | Signs are points on poles, assigned to a side by `ELMNTKEY`. Arrow and extent semantics are not published (sign test 2026-10-24). An E3 side qualifies only when every sign assigned to it is parsed (rule 2). A side with no sign record is `UNKNOWN` under ADR-0002 E3, and that is 35 of the 60 probe sides in layer 0. |
| C4 | **fail** | No published grammar for sign text. Layer 0 `STANDARDTEXT` is blank on all 32 restrictive records in the probe sample. `CATEGORY` is single-valued, and `PR` ("Parking-Regulatory", 5,194 signs) cannot be classified. Day fields cover start and end day only, with no holidays. |

**Verdict: not eligible as a parking layer.** It is a register source; see section 2.

### Lots (E6)

Not re-fetched. The 2026-10-24 author review ([seattle-lots-review-2026-10-24.md](seattle-lots-review-2026-10-24.md)) and its evidence stand:
- **Metro `PARKRIDE_POINT_386`:** C3 fail (points), C4 fail (no rule fields).
- **Sound Transit `ParkingSites`:** C3 pass (footprints), C2 partial, C4 fail (rules only in HTML).
- **Seattle Public Garages and Parking Lots:** C1 fail (a business-licence directory).
- **City-owned lots:** none found.

The rule 2 bar is C1–6, which is what those reviews applied before criterion 7. **No E6 layer is eligible.** Lots also have no E5 source (rule 4), so they could not show the label even with an eligible layer.

## 2. Restriction register (rule 3), draft

The draft lists every official source found in the jurisdiction or from an agency operating there. Discovery covered:
- the City org's full service directory (1,029 services);
- ArcGIS Online searches for bus stops, school zones, street sweeping, events and closures, Street Use, loading, disabled, tow-away, Port of Seattle, WSDOT and citations;
- the data.seattle.gov catalog.

The Socrata catalog API returned no results for the domain; the legacy `/api/views.json` search did.

### Sources

Counts and edit dates are fresh as of 2026-10-26 unless marked. "Location" gives how rule 4's location-uncertainty rule would apply.

| # | Source (owner) | Records | Last edit (UTC) | Location | Categories recorded | Notes |
|---|---|---:|---|---|---|---|
| R1 | Blockface competing-use fields (SDOT) | 47,926 sides | 2026-10-26 | side | no parking, no stopping, bus, peak, permit, payment, time limit, carpool, "zone" (passenger load, disabled, school and others), loading | Most count fields undocumented; `LOAD_` empty; probe shows a side with a tow-away sign and null `PEAK_HOUR` |
| R2 | Parking Signs layer 0 / Parking Features 4 (SDOT) | 98,146 / 97,698 | 2026-10-26 | point on side (`ELMNTKEY`); whole side withheld | All sign categories: PNP 50,112; PRZ 11,355; PTIML 5,025; PBZ 3,338; PLU 3,300; PNS 3,150; PDIS 1,879; PPL 1,775; PPEAK 1,247; PZONE 1,203; PSCH 1,158; PS 1,005; PCVL 621; PTRKL 394; PBLO 324; PPP 233; PGA 229; PCARPL 4; P1H 2; PR 5,194 (unclassifiable); PINST 6,598 (informational) | No arrow or extent semantics; text grammar unpublished |
| R3 | SDOT Street Signs layer 1 (SDOT) | 210,039 | 2026-10-26 | as R2 | as R2, plus `CURRENT_STATUS` and full `TEXT` | Same Hansen asset table as R2, with a status field |
| R4 | Restricted Parking Zones 4 / Signed Blocks 0 (SDOT) | 35 / 72,188 (signed blocks 2026-10-23) | 2026-10-26 | polygon / line | permit | 7 of 35 zones have conflicting, split or alternative hours (2026-10-23) |
| R5 | RPZ Husky Game Days 3 (SDOT) | 2 | 2026-10-26 | polygon | events | No dates in the layer |
| R6 | Peak Hour Parking Restrictions 3 (SDOT) | 492 | 2026-10-26 | line | peak hour, tow-away | `PKHRCODE`/`PKHRDESC` |
| R7 | Curbspace Transit Layover 0 (SDOT) | 282 | 2026-10-26 | curb space | bus layover | Day and time fields |
| R8 | Existing Layover Zone 0 (SDOT) | 38 | 2020-05-01 | curb space | bus layover | Over 24 months old; superseded by R7? Not established |
| R9 | Transit Lanes 1 (SDOT) | 1,174 | 2026-09-04 | lane segment | no stopping or parking during transit hours (`GPRestrictedTimes`), peak | 52 days since edit; sync freshness is a checker matter |
| R10 | Curb Space Categories 6 / Paid Area Curb Spaces 0 (SDOT) | 40,539 | 2026-10-26 | curb space | payment, loading, disabled, bus, no parking in **paid areas only** | Loading labelled `PAID`; use `SPACETYPE` |
| R11 | Pay Stations 0 (SDOT) | 1,631 | 2026-10-26 | point | payment | Withhold-only |
| R12 | Parking Tiers 0 (SDOT) | 37 (2026-10-23) | 2026-10-23 | polygon | payment area | Context |
| R13 | Temporary No Parking 0/1/2 (SDOT, E5) | 834 current | 2026-10-26 | curb space | temporary restrictions, events | **Pending C4** (scheduled vs actual times). Holds contact names and phones; adapters must not store them. |
| R14 | Temporary No Parking Unpaid 10 (SDOT, E5) | 1,187 | 2026-10-26 | point (address) | temporary restrictions | Pending C3/C4; contact fields as R13 |
| R15 | Street Closure BPPS (SDOT) | 113 | 2026-10-20 | line (`segkey`) | closures | Permit closures with weekday flags and dates |
| R16 | Road Closure (Active) 2 (SDOT) | 23,873 street segments | 2026-09-24 | street segment (both sides) | closures | `ClosureStatus`/`ClosureDTTM`; semantics undocumented |
| R17 | Street Use permits (`SU_Permit_Data_Model_Relationships`) (SDOT) | 244,709 permit points | 2026-10-26 | point (address) | closures, temporary use | Whether a permit removes parking is not assessed; use-impact layers 1–2 not opened |
| R18 | Special Event Permitting Downtown Core (City) | 1 polygon | 2025-05-30 | polygon | events (area only) | No dates or restrictions |
| R19 | School Zones (SDOT) | 170 | 2026-10-26 | line | — | School speed zones with `ZONE_NAME` only; **records no parking restriction** |
| R20 | Street Sweeping Routes 0 (SDOT) | 8,942 | 2026-10-26 | line | — | Sweeping operations; sampled schedule fields blank; **records no parking restriction** |
| R21 | SPU Street Sweeping 0–2 (SPU) | 3 today / 60 routes | 2026-10-26 | line | — | Sweep schedule with `NEXT_SWEEP_DATE`; **records no parking restriction** |
| R22 | King County Metro Stops `TRANSITSTOP_POINT_2648` (King County) | 15,077 (Seattle: 2,908 `ACT`, 2,970 `CLO`, 165 `INA`, 14 `PLN`) | 2026-10-26T12:05Z | point; every side within 15 m | bus | `STOP_STATUS` codes undocumented; `CURBPAINTLENGTH` present. Licence: King County GIS terms link (recorded) |
| R23 | Metro `PARKRIDE_POINT_386` + Metro pages (King County) | 87 lots | 2026-10-14 (2026-10-24 review) | point | lot eligibility, maximum stay, permit, closure | HTML rules |
| R24 | Sound Transit `ParkingSites` + pages (Sound Transit) | 43 | 2026-05-27 (2026-10-24 review) | footprint | lot eligibility, maximum stay, permit | HTML rules |
| R25 | Seattle municipal code / SDOT parking-signs page | — | page HTTP 200 2026-10-23 | jurisdiction | general 72-hour limit | Used for rule 4 "stay too long" |
| R26 | Citation and complaint data (City, Socrata) | `jxcr-rhfz` infractions, rows updated 2019-06-12; `74ix-6xdj` 72-hour complaints, 2026-10-25 | — | — | signal only | `jxcr-rhfz` is over 60 days behind. Listing it would withhold the label citywide (rule 4), so the author recommends recording it as **excluded, historic**. `74ix-6xdj` holds complaints, not citations or restrictions, plus personal data, so it is recommended **excluded**. |

**Searched, nothing found (2026-10-26):** WSDOT parking restrictions on state routes, Port of Seattle parking or curb rules, tow-away zones beyond peak-hour signs, and a City citation feed after 2019. Not inventoried: University of Washington campus parking, and Seattle Parks and Seattle Center lot rules (none found on 2026-10-24).

### Category map

| Rule 3 category | Sources (streets) | Sources (lots) | Coverage |
|---|---|---|---|
| No stopping | R1 `NOSTOP`, R2 PNS, R9 | — | Partial: signs are points, extent unknown |
| Tow-away | R2 PPEAK, R6, R1 `PEAK_HOUR`; other tow-away only in sign free text | — | Partial |
| No parking (incl. partial) | R1 `NOPARK`/category, R2 PNP | — | Partial: Blockface misses it on 42% of clean Unrestricted sides (probe) |
| Peak hour | R6, R1 `PEAK_HOUR`, R2 PPEAK, R9 | — | Partial: probe side 76913 has a live peak tow-away sign, but neither R1 `PEAK_HOUR` nor R6 records it |
| Loading (commercial, truck, passenger) | R2 PLU, PCVL, PTRKL, PPL; R10 in paid areas; R1 `ZONE`; R1 `LOAD_` empty | — | Unpaid streets: sign points only |
| Bus and transit layover | R22, R2 PBZ and PBLO, R7, R8, R1 `BUS`, R9 | — | Covered: Metro stop points (15 m rule), layover spaces and signs |
| Disabled-only | R2 PDIS, R10 (paid areas), R1 `ZONE` | — | Unpaid streets: sign points only |
| Permit or resident-only | R4, R1 `RPZ_SPACES`, R2 PRZ | R23, R24 (HTML) | Covered, with known hour conflicts |
| Eligibility (customers, riders, carpool) | R1 `CARPOOL_SPACES`, R2 PCARPL and PGA | R23, R24 (HTML only) | Streets partial; lots not machine-readable |
| Vehicle class | Free text in R2/R3 only (PZONE lumps motorcycle, carshare and others) | — | **No source records it as a field** |
| School zone | R2 PSCH (school bus and load) | — | Sign points only; R19 holds speed zones, not parking |
| Street cleaning | — (R20 and R21 hold operations only) | — | **No source records a parking restriction** |
| Events and closures | R5 (no dates), R13, R15, R16, R17, R18 (area only), R2 PZONE | R23 closure notices (HTML) | **Events with dates: none**; closures partial |
| Temporary restrictions | R13, R14 | — | Sources exist; **none approved as E5** |
| Payment | R1 paid fields, R10, R11, R12, R2 PS and PPP | R23, R24 (HTML) | Streets covered in paid areas. No payment source is approved, so the label text must use the "payment is not recorded" variant (rule 1). |
| Time limit shorter than stay | R1 `TL_SPACES`/`PARKING_TIME_LIMIT` (hours null), R2 PTIML and P1H, R4 | R23, R24 (maximum stay, HTML) | Streets partial; lots not machine-readable |

**Categories to name on the city page and in the popup**, in the style rule 3 gives: "Vehicle-class restrictions, street cleaning and event-day parking rules are not in any official dataset here. Loading, disabled and school zones on unpaid streets are recorded only as sign locations."

## 3. Measurement signal (rule 5)

Rule 5 needs either an official source not used to compute the labels, or a held-out register source. A held-out source must be in the approved register, separately maintained (not a view or export of another input), and carry records across the sampled area.

| Candidate | In register | Separately maintained | Records across the area | What it detects | Verdict |
|---|---|---|---|---|---|
| **SDOT sign inventory** (R2, or R3 for status) | yes (draft) | **Yes on the letter:** it is the primary Hansen sign asset table, not a view of Blockface. But the Blockface form says non-CSM counts and the category are computed from "SDOT Hansen sign inventory". So an unrecorded sign is missing from both: a **shared blind spot**, to be named, not counted. | 98,146 signs citywide, but 35 of 60 probe sides have no parking-sign record | Signed restrictions anywhere on a side, by `CATEGORY` | **Qualifies; predicted to fail** (below) |
| **King County Metro Stops** (R22) | yes (draft) | yes: King County, a separate agency and system | 6,057 Seattle stop records with `IN_SERVICE_FLAG='Y'`, of which 2,908 `ACT` | Bus stops within 15 m only | **Qualifies on the letter; measures one category.** Rule 5 sets no minimum scope. Whether a bus-stop-only bound satisfies the rule's intent is an open question for the reviewer and the owner, who sets the acceptable bound. |
| Curb Space Categories (R10) | yes | yes | **no**: paid areas only, where labels never appear (payment withholds) | — | Does not qualify |
| Peak (R6), Layover (R7), Transit Lanes (R9), closures (R15, R16) | yes | yes | **no**: 113 to 1,174 records on arterials and corridors | — | Does not qualify |
| Citation data | — | — | `jxcr-rhfz` ended 2019; no current geocoded citation feed | — | Does not qualify |
| Independent non-input source | — | — | none found | — | none |

### Sign hold-out feasibility probe

This probe is **not** the rule 5 measurement. It used no (place, time) pairs, was run by the author agent, and used Blockface as the only input. It was pre-registered in `542db53` (`probe-preregistration.json`, 2026-10-26T23:22:17Z) before any sign record was fetched:
- **Population:** the 28,647 Blockface "Unrestricted Parking" sides with every competing-use field zero or null.
- **Sample:** `random.Random(138).sample(ids, 60)`.
- **Signal:** Parking Signs layer 0 on the same `ELMNTKEY`, with SDOT Street Signs layer 1 as a status sensitivity check.

One retrieval failed because of a wrong field name (`TEXT` instead of layer 0's `STANDARDTEXT`). It is logged as `raw/probe-signs0-attempt1-error.json` and was rerun with the same sample and classes.

**Result** (computed 2026-10-26T23:22:53Z):
- **25 of 60 sides (42%; exact 95% CI 29–55%)** carry a no-parking or tow-away class sign. Every one of those signs is `INSVC` in layer 1.
- No side carries a permit, payment, time-limit or unclassifiable sign. 35 sides carry no parking sign at all.

By sign type (descriptive, not pre-registered; `probe-breakdown.json`), counted in distinct sides; a side can appear in more than one row:

| Sign type | Sides |
|---|---:|
| 30 ft clearance (`R7-WI30`) | 16 |
| Arrowed no parking (`R7-NPR`, `R7-NPL`) | 7 |
| "No parking north/west of here" | 2 |
| "No parking 2–5 AM" | 1 |
| Peak-hour tow-away, "6-9AM 3-7PM … TOW-AWAY ZONE" | 1 |

The tow-away side has a null Blockface `PEAK_HOUR`.

**What this predicts (inferred, not measured).** Holding the sign inventory out, the measured label is Blockface plus the remaining register sources. Every one of the hits above would be a miss of a restriction that prohibits parking or leads to towing. Under rule 5 a single such miss blocks the city.
- If the probe rate holds, the chance of zero such misses in 30 sampled places is about 1 in 10 million (25/60).
- With clearance-only sides excluded, it is about 0.2% (11/60). Clearances could arguably count as parking law already covered by the label text, but rule 3 lists partial no-parking as a category.

The other register sources (R6, R9, R22) cover few of these sides, so the estimate is unlikely to fall much; that part is not measured. Holding signs out therefore predicts a hard block. Using signs as an input instead leaves only the bus-stop measurement above.

## What would change the verdict

These are conditions for a re-review, not requests to anyone (ADR-0004):

1. Temporary No Parking passes C4: its scheduled, actual and custom-time semantics are documented or determinable from fields. It is then approved as E5 for streets by two agents.
2. A parking layer passes C4 for its role from documented fields. For Blockface that means SDOT publishing definitions for the count fields, or a category definition that excludes partial time limits and partial no-parking. Two agents then approve it for the parking-layer role.
3. The register above, or an amended one, is approved by two agents. The checker uses undocumented fields only to withhold, never to define the population that receives the label.
4. The owner sets the maximum miss bound and decides whether a held-out source that detects one category satisfies rule 5. Alternatively, a broader independent signal appears, for example a current geocoded citation feed.
5. An independent agent pre-registers and runs the rule 5 measurement and passes it.

Even with all of these, the probe predicts that a sign-based measurement fails. A bus-stop-only measurement would leave no-parking, tow-away and loading misses unmeasured, and they would have to be named as such on the city page.

## Not verified

- Field truth for any sign or Blockface record (no field work, ADR-0004).
- Street Use permit use-impact layers (R17, layers 1–2): not opened.
- `STOP_STATUS` meanings for Metro stops (`CLO`, `INA`, `PLN`); Road Closure (Active) closure semantics.
- Whether Existing Layover Zone (R8) is superseded by Curbspace Transit Layover (R7).
- Municipal code text: the 72-hour limit relies on the 2026-10-23 SDOT page retrieval; the code itself was not re-extracted.
- Lot evidence: reused from 2026-10-24, not re-fetched.
- The rule 5 measurement itself: not run; it is for an independent agent after register approval.

## Validation

- `shasum -a 256 -c SHA256SUMS` in the artifact directory.
- Every relative link in this file and the cross-link in [seattle.md](seattle.md) resolves.
- `git diff --stat origin/dev` touches only this file, `docs/sources/seattle.md` and the new artifact directory.
- No application, database or preview rung applies to this docs and evidence change. No Neon or production access was used.
