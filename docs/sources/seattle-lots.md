# Seattle region official lots and park-and-rides (E6): source inventory

Status: draft. Author review on 2026-10-24 for [#125](https://github.com/BinaryDevil/find-free-parking/issues/125); an independent reviewer agent has not yet re-checked it ([#131](https://github.com/BinaryDevil/find-free-parking/issues/131)).
Timezone: America/Los_Angeles
Coverage verdict: none. No E6 source is approved, and no lot may be shown as Verified Free from these sources.
Policy: [ADR-0002: Evidence Source Policy](../adr/0002-evidence-source-policy.md), [ADR-0001](../adr/0001-verified-rules-only.md), [ADR-0004](../adr/0004-no-external-outreach.md), [ADR-0005](../adr/0005-agent-verified-gates.md)
Review and evidence: [2026-10-24 review](seattle-lots-review-2026-10-24.md); [`artifacts/issue-125-seattle-lots-2026-10-24/`](../../artifacts/issue-125-seattle-lots-2026-10-24/)
Curb inventory: [seattle.md](seattle.md) (not changed here)

This inventory covers E6 only: lots owned or run by the City of Seattle, King County Metro and Sound Transit, plus Kirkland or Bellevue city lots where found. Curbs, source activation, database writes and Coverage are out of scope. All retrieval was read-only, with no contact with any agency (ADR-0004).

## Summary

- Official operators publish **machine-readable lot locations with stable IDs**: King County Metro (87 points) and Sound Transit (43 footprints). Neither layer carries hours, prices, eligibility or maximum stay.
- Those rules exist only as **prose on operator web pages**: a system-wide policy plus per-lot notes. Every rule found is **conditional**: transit customers only, carpool or vanpool only, a 24- or 72-hour maximum, weekday windows, levels or sections, permit areas, temporary closures, and rooftop or future fees. None is unconditional "free".
- The pre-registered spot checks found **8 contradictions in 12** Metro lots and **2 contradictions plus 2 Unknown in 10** Sound Transit lots. That is the result of pairing each layer with its operator's system policy, as an adapter would. Both fail criterion 7, so nothing is approved.
- Two official publishers disagree about the same lots. Metro's regulations give a 72-hour limit, while Sound Transit gives 24 hours for facilities it owns and operates. Metro's Northgate page also lists a "Northgate Station Garage" whose fees differ from P&R A's. Treating that garage as P&R A is inferred from Sound Transit's naming, so this disagreement is not established.

## Evidence types

| Type | Source(s) | Searched (if none found) |
|---|---|---|
| E1 Block-level regulations | Out of scope (see [seattle.md](seattle.md)) | — |
| E2 Meter / payment feed | Out of scope | — |
| E3 Sign inventory | Out of scope | — |
| E4 Zone polygons | Out of scope | — |
| E5 Temporary restrictions | Out of scope. Sound Transit service alerts carry lot closures (e.g. Kent) as prose only. | — |
| E6 Lots / operators | Metro `PARKRIDE_POINT_386` + Metro pages (pending); Sound Transit `ParkingSites` + Sound Transit pages (pending); Sound Transit `STparking`, `STFacilities`, Metro `ParkAndRide` (2018), WSDOT Park and Rides, Seattle Public Garages and Parking Lots (rejected) | City-owned Seattle lots with rules: none found (search places below) |
| E7 Bylaw default rule | Out of scope | — |
| Signals | WSDOT Park and Rides (location and stall count only) | — |

### Places searched (ADR-0002 order, 2026-10-24)

1. **City open-data portal.** Socrata catalog queries "parking seattle", "parking king county", "park and ride washington" ([raw](../../artifacts/issue-125-seattle-lots-2026-10-24/raw/)). Results are paid-parking transactions, occupancy studies and violations. **None found** for lot rules. Seattle Parks datasets list park features, not parking permission.
2. **City ArcGIS organization.** Seattle's `Public_Garages_and_Parking_Lots/1` (assessed below). Seattle Center's parking page `seattlecenter.com/visit/parking` returned HTTP 404 on 2026-10-24. **No city-owned lot layer with hours, price or eligibility found.** The earlier Seattle GIS-server crawls are recorded in [seattle.md](seattle.md).
3. **ArcGIS Online search.** "park and ride" (1,858 hits worldwide), Seattle/King County/Bellevue/Kirkland lots and garages, and "Sound Transit" parking. This found the King County, Sound Transit and WSDOT layers below. No Bellevue city lot layer was found. Kirkland's `PaidParkingLots` is already inventoried in [kirkland.md](kirkland.md) and is not re-assessed here.
4. **Regional datasets.** WSDOT `Shared/TransitData/MapServer/1` (assessed below).
5. **Transit agencies.** King County Metro (AGOL org `Ej0PsM5Aw677QF1W`, parking-locations, regulations and Northgate pages). Sound Transit (AGOL org `MYIhHZJIRGCSLjBW`, parking, parking-locations and station pages, sitemap). Community Transit's park-and-ride page loads its lot list by script, so it gave no static per-lot entries. **No operator API or structured rule feed found.** GTFS feeds were not fetched; the GTFS schedule format has no parking-rule fields (inferred from the specification, not measured).
6. **Municipal code.** Not searched. E7 defaults do not apply to lots.
7. **Citations.** Not used. Signals cannot establish lot rules.
8. **Gap.** No structured, per-lot rule data exists from any operator found. No request was sent (ADR-0004).

## Sources

### King County Metro Park and Ride Lots (`PARKRIDE_POINT_386`) with Metro's parking pages

- Type: E6
- Publisher / channel: King County GIS (AGOL org `Ej0PsM5Aw677QF1W`, owner `KingCounty`) for the layer. King County Metro's [parking locations](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations), [regulations](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations/regulations) and [Northgate](https://kingcounty.gov/en/dept/metro/programs-and-projects/transit-oriented-communities/northgate) pages for rules.
- Endpoint: [FeatureServer/0](https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARKRIDE_POINT_386/FeatureServer/0). It is also listed as `gisdata.kingcounty.gov/.../OpenDataPortal/transportation___base/MapServer/386`, which returned the portal HTML page rather than JSON.
- Geometry and precision: point per lot. The point is neither a footprint nor a marked entrance. In the sample, Metro's own map pins lie 2–128 m from it.
- Records: 87 as of 2026-10-24; last edited 2026-10-14T19:22:09Z. Ownership: 59 `P`, 28 `L` (leased: churches, retail, city parks).
- Fields used: `INVENTORY_ID` (stable lot ID), `NAME`, `ADDRESS`, `ZIP`, `OWNERSHIP_TYPE` (P/L), `OWNER` (KC, ST, S, P, C, blank), `REG_SPACES`, `ACCESSIBLE`, `LATITUDE`/`LONGITUDE`. There are **no fields** for hours, price, eligibility, maximum stay or closures.
- Rules published (prose only): "You may park at Metro park-and-rides for no charge-first come, first served" while the permit program is suspended. Impound applies to vehicles unattended over 72 hours, residential use or storage, spill-over from businesses, trailers, and vehicles over 10,000 lb. EV stalls are for charging only, at $2 per session. Per-lot notes add "Carpool and Vanpool only", "No transit customer parking", "No free parking at or nearby", level- and section-specific rules, and rooftop rates.
- Public availability: layer and pages retrieved without sign-in or payment (HTTP 200). No licence text shown on the layer.
- Spot check: 12 lots drawn at random (seed 125, stratified 8 P and 4 L), pre-registered in [`preregistration.json`](../../artifacts/issue-125-seattle-lots-2026-10-24/preregistration.json). **8 contradictions, 4 agree, 0 Unknown.** Contradicted fields: payment, permit areas, maximum stay (Sound Transit's 24 hours versus Metro's 72), eligibility (carpool/vanpool only), partial availability, and two lots not listed by any operator. See the [review](seattle-lots-review-2026-10-24.md#metro-sample).
- May establish (if a future structured rule source passes): lot `VERIFIED_FREE` only with its conditions (transit customer, maximum stay, sections), never street rules or vacancy.
- Unknown cases: every lot's rules today, because they are not in fields. Leased lots (owner rules unpublished), lots owned by Sound Transit or WSDOT (other operator's rules), Northgate's level, section and fee rules, construction closures, and lots missing from Metro's list.
- Verdict: **pending** (C3 point is not a footprint or entrance; C4 rules are not in fields or a documented format; C7 has 8 of 12 contradictions). C1, C2 (for locations and IDs), C5 (layer) and C6 pass. Pages carry no edit date.

### Sound Transit Parking Sites (`ParkingSites_gdb`) with Sound Transit's parking pages

- Type: E6
- Publisher / channel: Sound Transit AGOL org `MYIhHZJIRGCSLjBW`. The authority of this org is inferred from its Sound Transit-only services and its links to `soundtransit.sharepoint.com`; the org's portal record returns no name. Rules come from Sound Transit's [parking](https://www.soundtransit.org/ride-with-us/parking) page, its [parking locations](https://www.soundtransit.org/ride-with-us/parking/parking-locations) and its station pages.
- Endpoint: [FeatureServer/0](https://services8.arcgis.com/MYIhHZJIRGCSLjBW/arcgis/rest/services/ParkingSites_gdb/FeatureServer/0)
- Geometry and precision: polygon footprint per facility, which passes C3 for E6. For all 8 sampled lots with published pins, the pins lie 0–122 m from the polygon.
- Records: 43 as of 2026-10-24; last edited 2026-05-27T17:44:18Z. Facility types: 13 PR, 11 Parking, 7 TC, 7 FS, 4 Other, 1 Signal House. 9 of the 38 parking-type polygons have a null `FACILID`.
- Fields used: `FACILID` (stable ID where present), `NAME`, `FACILITY_TYPE`, geometry. `DATA_QUALITY` is mostly null. The as-built PDF paths point to a SharePoint site that needs sign-in. There are **no rule fields**.
- Rules published (prose only): facilities owned and operated by Sound Transit are open to transit passengers 24 hours a day, for "up to 24 hours" while on transit trips. Other operators' park-and-rides "may have different hours". Permit areas exist at 8 stations: free carpool permits at all 8, plus $60 monthly and $6 one-day permits at Northgate, Shoreline North and Shoreline South. Impound applies to parking over 24 hours, non-transit use, and trailers. "Starting in 2027, Sound Transit will begin charging user fees" at selected Link park-and-rides. Facility pages add their own limits (Ash Way "Up to 72 hours"; Northgate C weekday 6 am–8 pm, arrive before 10 am).
- Public availability: layer and pages retrieved without sign-in or payment. No licence text shown on the layer.
- Spot check: 10 of the 38 parking-type polygons drawn (seed 125). **2 contradictions, 6 agree, 2 Unknown.** The contradictions: Ash Way is operated by Community Transit and its page allows 72 hours. The layer has no operator field, so an adapter applying Sound Transit's system rule would derive 24 hours; the contradiction is with that derived claim, not between two Sound Transit statements. Yarrow Point Freeway Station has no parking listed by any operator. The Unknowns: Eastmont has no retrievable per-lot page, and Mountlake Terrace does not say where its permit area is. See the [review](seattle-lots-review-2026-10-24.md#sound-transit-sample).
- May establish (if a future structured rule source passes): lot `VERIFIED_FREE` with conditions, within the footprint.
- Unknown cases: rules for every polygon (prose only), the extent of permit areas within a footprint, lots that other agencies run inside Sound Transit footprints, polygons without `FACILID`, non-parking types (Other, Signal House), and the 2027 fee start.
- Verdict: **pending** (C2 has 9 of 38 parking polygons without a stable ID; C4 rules are not in fields; C7 has 2 contradictions and 2 Unknown). C1 passes with the inference noted, and C3, C5 and C6 pass.

### Sound Transit `STparking`

- Type: E6 candidate. [FeatureServer/0](https://services8.arcgis.com/MYIhHZJIRGCSLjBW/arcgis/rest/services/STparking/FeatureServer/0), 27 points, last edited 2025-06-11.
- Fields: `NAME`, `ADDRESS`, `PCAPACITY`, `LotOwned`, `FeatNum`, `ClimChng`, `Spaces`, `RAIL_STATI`. Values such as `ADDRESS` = "Near existing P&R or new location" and a climate-change score show that this is planning data, not operating data.
- Verdict: **rejected** (C3: points, some without a fixed site; C4: no rules). No spot check run.

### Sound Transit `STFacilities`

- Type: E6 candidate. [FeatureServer/0](https://services8.arcgis.com/MYIhHZJIRGCSLjBW/arcgis/rest/services/STFacilities/FeatureServer/0), 77 points. Layer edited 2025-06-12, but record `EDITDATE` values date from 2007–2008, and `WEBSITE` links use retired `x1887.xml` URLs. `Parking` is Yes/No/blank only.
- Verdict: **rejected** (C4: no rules; C5: record content over 24 months old). No spot check run.

### King County `ParkAndRide` (2018 copy)

- Type: E6 candidate. [FeatureServer/0](https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/ParkAndRide/FeatureServer/0), owner `kozlesm_kingcounty`, last edited 2018-10-02. The fields duplicate `PARKRIDE_POINT_386` plus `bikeLocker`.
- Verdict: **rejected** (C5: over 24 months; superseded by `PARKRIDE_POINT_386`).

### WSDOT Park and Rides

- Type: signal for E6. [MapServer/1](https://data.wsdot.wa.gov/arcgis/rest/services/Shared/TransitData/MapServer/1), 362 points statewide. Fields: lot name, location, address, approximate spaces, county, city, publish date.
- The layer's own description says WSDOT "cannot guarantee the accuracy of this data because most park and ride lots are operated by other agencies".
- Verdict: **rejected** (C1: the publisher is not the operator for most lots and disclaims accuracy; C4: no rules).

### Seattle Public Garages and Parking Lots

- Type: E6 candidate. [FeatureServer/1](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Public_Garages_and_Parking_Lots/FeatureServer/1), 700 points. Layer last edited 2026-10-19T17:22:07Z.
- Only 26 of 700 records have `HRS_MONFRI`, 27 have `RTE_1HR`, 23 have `RTE_ALLDAY` and 18 have `OP_WEB`. Every record with hours has record `DATETIME` 2020-07-07. Operators are private (SP+, Republic, IPM, Standard Parking and others), or are entities such as the Convention Center PFD and the Pike Place Market PDA. No record is a City of Seattle-run lot with rules.
- Verdict: **rejected** for E6 rules (C1: a business-licence directory of private operators, not the operator's own channel; C4: free-text hours in 4% of records; C5: rule content from 2020). This supersedes nothing in [seattle.md](seattle.md); it agrees with that file's 2026-10-09 finding.

### City of Seattle-owned lots (Seattle Center, Parks)

- No machine-readable source with hours, price or eligibility found. Seattle Center's parking page returned 404 on 2026-10-24.
- Verdict: **none found**.

### Kirkland and Bellevue city lots

- Kirkland `PaidParkingLots` (5 polygons): inventoried in [kirkland.md](kirkland.md), where conditions still need reconciliation. Not re-assessed here.
- Bellevue: **none found** in ArcGIS Online search.

## Conditions observed (structured, for the display ticket #127)

Every permission found is conditional, so none may be flattened to "free". The adapter tickets carry these as fields:

| Condition | Values seen | Example (operator page) |
|---|---|---|
| `eligibility` | `transit_customer` (Metro), `transit_passenger` (Sound Transit), `carpool_vanpool_only`, `carpool_vanpool_community_ride_only`, `retail_customer` (rooftop or floors reserved), `permit_holder` | Black Diamond, Klahanie #1/#3, Northgate A rooftop |
| `max_stay_hours` | 24 (Sound Transit-owned; Northgate A; Mountlake Terrace), 72 (Metro regulations; Ash Way; Northgate D) | Sound Transit parking page; Ash Way page |
| `windows` | days plus start and end, with `arrive_before` | Northgate C: Mon–Fri 06:00–20:00, arrive before 10:00, orange stalls only after 10:00 |
| `fee` | none; `rates_apply` (rooftop); $2 per EV session; future user fees from 2027 | Northgate A; Metro EV note; Sound Transit parking page |
| `permit_areas` | free carpool/HOV; $60 monthly single-occupant; $6 advance one-day; `program_suspended` | Sound Transit permit table; Auburn, Kent, Mukilteo, Tukwila |
| `area_scope` | levels (B1–B4), floors and colour-coded stalls (P2 orange), sections (southern section only) | Northgate A, C, D |
| `valid_from` / `valid_to` | temporary closure or capacity reduction | Kent NW surface lot closed 2026-03-16 to 2027-01-01, except 3 ADA spaces (alert on the Kent station page) |
| `vehicle_limits` | ≤ 10,000 lb; no trailers; no residential or storage use; no non-transit use | Metro and Sound Transit impound lists |

## Unknown areas and gaps

- **All lot rules in the region stay Unknown.** No operator publishes rules in fields or a documented format, and both operator layers failed criterion 7 when paired with their system policies.
- Leased Metro lots (28) publish no owner rules. Of the four leased lots sampled, two do not appear on any operator's list.
- Lots run by one operator and listed by another get conflicting maximum stays (24 versus 72 hours). The layer's `OWNER` field marks these, but the rule for each lot still needs a per-lot statement.
- Freshness: Metro pages carry no edit date. Sound Transit's sitemap gives `lastmod` dates for its parking page (2026-09-09), its permits page (2026-09-30) and its station pages (2025-02 to 2026-04), but not for its parking-location pages.
- Paid parking (the secondary view): only Northgate's permit prices and rooftop "rates apply" were found, and neither is in a structured form.

## Tickets

- Adapter, Metro park-and-ride lots: [#129](https://github.com/BinaryDevil/find-free-parking/issues/129)
- Adapter, Sound Transit parking sites: [#130](https://github.com/BinaryDevil/find-free-parking/issues/130)
- Independent source review: [#131](https://github.com/BinaryDevil/find-free-parking/issues/131)
- Display of conditional free: [#127](https://github.com/BinaryDevil/find-free-parking/issues/127)
