# Seattle region lots (E6): author review, 2026-10-24

Issue: [#125](https://github.com/BinaryDevil/find-free-parking/issues/125). Inventory: [seattle-lots.md](seattle-lots.md). Evidence: [`artifacts/issue-125-seattle-lots-2026-10-24/`](../../artifacts/issue-125-seattle-lots-2026-10-24/) (checksums in `SHA256SUMS`; every request with its UTC time and HTTP status in `retrievals.tsv`, where five superseded zero-result or wrong-service responses are marked "not retained").

This is the author agent's review under ADR-0005. It approves nothing. An independent reviewer agent must re-fetch and re-check every criterion before any approval.

**Result: no source approved. Coverage none. Both operator layers fail criterion 7.**

## Method

1. **Discovery** (2026-10-24, 18:09–18:12 UTC). ArcGIS Online and Socrata catalog searches, the King County and Sound Transit AGOL service directories, layer metadata and counts, and Metro's and Sound Transit's parking pages (for discovery only).
2. **Pre-registration** (commit `cec6316`, 2026-10-24T18:14:27Z). Committed before any per-lot spot-check page was fetched: [`preregistration.json`](../../artifacts/issue-125-seattle-lots-2026-10-24/preregistration.json), with `PREREG-SHA256SUMS` and [`method/prereg.py`](../../artifacts/issue-125-seattle-lots-2026-10-24/method/prereg.py). It fixes:
   - **Populations:** Metro `PARKRIDE_POINT_386` (87 lots; strata 59 `P` and 28 `L`) and Sound Transit `ParkingSites` with `FACILITY_TYPE` in PR, Parking, TC or FS (38 of 43).
   - **Seed** `125` with Python `random.Random`. It draws 8 P, then 4 L, then 10 ST lots from sorted ID lists.
   - **Claims tested:** the per-lot rule an adapter would derive from the layer record plus the operator's system policy. Metro: transit customers, no charge, any hour, 72-hour maximum. Sound Transit: transit passengers, 24 hours a day, 24-hour maximum, no charge outside the listed permit stations.
   - **Independent signals:** the operator's own per-lot listing or facility page; the other public operator's page where it owns or runs the lot; published coordinates.
   - **Contradiction rule:** any differing or omitted fee, permit area, eligibility, time window, closure or maximum stay; a lot not listed as operating; or a location more than 150 m off. Unknown counts as not confirmed. The pass threshold is zero contradictions and zero Unknown.
   - **Disclosure:** some system pages and the Eastgate facility page were fetched before registration, for discovery only. Eastgate was not drawn.
3. **Spot-check retrieval** (from 18:14:43 UTC). Metro's list, regulations and Northgate pages were re-fetched. Sound Transit's parking, parking-location and station pages, one service alert (Kent garage capacity), and King County address-locator results for Duvall were also fetched.
4. **Scoring.** Results are recorded in [`spot-check-results.json`](../../artifacts/issue-125-seattle-lots-2026-10-24/spot-check-results.json) by [`method/results.py`](../../artifacts/issue-125-seattle-lots-2026-10-24/method/results.py). Sound Transit pin distances are in `st-location-check.json` from `method/st_location.py`. Station pages publish transit-stop pins, not lot pins, so those location checks are stop-to-footprint distances.

## Metro sample

**8 contradictions, 4 agree, 0 Unknown (12 lots).**

| ID | Lot | Result | Fields | Finding | Location |
|---|---|---|---|---|---|
| 922 | Northgate Garage | **contradiction** | payment, permit areas, maximum stay | Metro list: free on B1–B4, rooftop reserved for mall customers with rates. Metro's Northgate page lists a separate "Northgate Station Garage" (free on levels 1–2 Mon–Fri 5–9 am only, fees otherwise). That this is P&R A is inferred from Sound Transit's naming, so a disagreement between Metro's pages is not established. Sound Transit station page: up to 24 hours, with carpool, monthly and one-day permits. | 95 m |
| 727 | South Bellevue Station Parking Garage | **contradiction** | maximum stay | `OWNER` = ST. Sound Transit's 24-hour rule for its facilities, against the 72 hours derived from Metro. A system-level signal; the station page gives no hours. | 77 m |
| 726 | Redmond P&R Garage | agree | — | Metro list and Sound Transit page: 377 spaces, no conditions. `OWNER` = KC. | 2 m |
| 873.1 | Auburn Surface Lot at Auburn Station P&R | **contradiction** | maximum stay | `OWNER` = ST, so 24 hours against 72 (system-level). Metro's permit reservation is suspended. | 128 m |
| 872.1 | Kent Station Surface Lot P&R | **contradiction** | maximum stay; closure (identity inferred) | `OWNER` = ST, so 24 hours against 72. An alert on the Kent station page closes the NW Sounder surface lot from 2026-03-16 to 2027-01-01, except three ADA spaces. That this is the same lot is inferred. (The separately saved alert concerns reduced garage capacity, 2026-08-10 to 2027-02-15.) | 71 m |
| 753 | Northgate Transit Center P&R | **contradiction** | partial availability | Metro's Northgate page: only the "southern section of Park & Ride D" is available to transit customers. Construction notice on Metro's list. | 89 m |
| 731 | Duvall P&R | agree | — | Three different published addresses all geocode within 69 m of the layer point (King County address locator). | 0–69 m |
| 751 | SR 18/Auburn-Black Diamond Rd P&R | **contradiction** | who may park | Metro list: no transit service, carpool and vanpool only. | 11 m |
| 632 | Redmond Ridge P&R (leased) | **contradiction** | not listed | Absent from Metro's and Sound Transit's lists (absence-based). | — |
| 521 | Kent Covenant Church P&R (leased) | **contradiction** | not listed | Absent from Metro's and Sound Transit's lists (absence-based). | — |
| 540 | Tibbetts Valley Park P&R (leased) | agree | — | Metro list and Sound Transit page agree, with no conditions. | 114 m |
| 516 | QFC Village P&R (leased) | agree | — | Metro list: no conditions. Space counts differ (14 against 21), which is not a safety field. | 38 m |

Five contradictions rest on per-lot statements (922, 753, 751, 632, 521). Three rest only on Sound Transit's system-wide 24-hour rule for lots the layer marks as Sound Transit-owned (727, 873.1, and 872.1, apart from its closure). Even without those three, the sample fails.

## Sound Transit sample

**2 contradictions, 6 agree, 2 Unknown (10 lots).**

| ID | FACILID | Lot | Result | Finding | Location |
|---|---|---|---|---|---|
| 23 | RE09 | Mercer Island Park and Ride | agree | 447 spaces, no hours, not a permit station. | inside |
| 2 | SRP05 | Edmonds Station - Parking | agree | 156 spaces, not a permit station. | 29 m (stop pin) |
| 6 | SRP03 | Mukilteo Station - Parking | agree | 63 spaces, permit program suspended. | 122 m (stop pin) |
| 12 | SRP09 | Tukwila Station - Parking | agree | 390 spaces, permit program suspended. | 31 m (stop pin) |
| 50 | 571 | Eastmont Park & Ride | **Unknown** | No Sound Transit or Metro entry; Community Transit's list is script-loaded. | — |
| 52 | (null) | Yarrow Point Freeway Station | **contradiction** | No operator lists parking, and there is no facility page (absence-based). | — |
| 45 | (null) | Ash Way Park & Ride | **contradiction** | Facility page: operated by Community Transit, "Hours: Up to 72 hours". The layer has no operator field, so the derived claim applies Sound Transit's 24-hour rule for its own facilities. The conflict is with that derived claim, not between Sound Transit statements. | 40 m |
| 24 | RE04 | Mountlake Terrace Freeway Station | **Unknown** | Hours and carpool-permit area published for the station as a whole, not located within this footprint. | inside (stop pin) |
| 5 | SRP23 | Lakewood Station - Parking | agree | 601 spaces, not a permit station. | 43 m (stop pin) |
| 30 | RE11 | South Sammamish Park and Ride | agree | 265 spaces; Metro agrees. | 16 m |

The six agreements are weak: they agree because neither the facility page nor the claim states any lot-specific condition, not because a per-lot rule was confirmed.

## Criteria matrix (2026-10-24)

| Source | C1 Authority | C2 Machine-readable, stable | C3 Precision | C4 Schedule semantics | C5 Freshness | C6 Public | C7 Spot check | Verdict |
|---|---|---|---|---|---|---|---|---|
| Metro `PARKRIDE_POINT_386` + Metro pages | pass (King County GIS; Metro pages) | pass for locations and IDs (`INVENTORY_ID`); **fail for rules** (HTML prose) | **fail**: point, not a footprint or entrance | **fail**: no rule fields; exceptions in free text | pass: layer edited 2026-10-14; pages undated | pass | **fail**: 8/12 | **pending** |
| Sound Transit `ParkingSites` + Sound Transit pages | pass (org authority inferred) | **partial**: 9/38 without `FACILID`; rules in HTML only | pass: footprints | **fail**: no rule fields | pass: 2026-05-27; parking page lastmod 2026-09-09 | pass | **fail**: 2 contradictions, 2 Unknown of 10 | **pending** |
| Sound Transit `STparking` | pass | pass | **fail**: planning points | **fail** | pass (2025-06-11) | pass | not run | **rejected** |
| Sound Transit `STFacilities` | pass | pass | point | **fail** | **fail**: records 2007–2008 | pass | not run | **rejected** |
| King County `ParkAndRide` (2018) | pass | pass | point | **fail** | **fail**: 2018-10-02 | pass | not run | **rejected** |
| WSDOT Park and Rides | **fail**: not the operator; disclaims accuracy | pass | point | **fail** | `PublishDate` field only | pass | not run | **rejected** (signal) |
| Seattle Public Garages and Parking Lots | **fail**: business-licence directory of private operators | pass | point | **fail**: 26/700 free-text hours | **fail**: rule records 2020-07-07 | pass | not run | **rejected** |
| Seattle city-owned lots | — | none found | — | — | — | Seattle Center page 404 | — | **none found** |

## What would change the result

These are conditions for a re-review, not plans to contact anyone (ADR-0004):

- An operator publishes per-lot rule fields (eligibility, maximum stay, windows, permit areas, fees, closures) in its layer or an API, with a documented format.
- Lots with conflicting operator rules (Sound Transit-owned lots on Metro's list) have a per-lot statement from the operating agency.
- A fresh pre-registered sample of 10 or more lots shows zero contradictions and zero Unknown.

## Not verified

- No field visits or sign photos (ADR-0005 allows other signals; none of the per-lot signals is a sign).
- Lot identity for Kent 872.1 against the closed NW surface lot is inferred from the address.
- The Sound Transit AGOL org's authority is inferred from its content; its portal record returned no name.
- GTFS feeds were not fetched; the statement that they carry no parking rules comes from the GTFS specification.
- Community Transit lots: its list is script-rendered and was not retrieved per lot.
