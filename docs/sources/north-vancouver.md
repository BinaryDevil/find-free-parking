# City of North Vancouver, British Columbia: source inventory

Status: draft
Timezone: America/Vancouver
Coverage verdict: none (no approved source; not covered)
Draft partial target: precisely assigned City curb segments with complete, reconciled time-limit, payment, prohibition and applicable vehicle/permit conditions. Permit eligibility polygons alone are excluded. All other streets and lots remain Unknown.
Policy: [ADR-0002: Evidence Source Policy](../adr/0002-evidence-source-policy.md)
Observed: 2026-10-13; counts are live public source records, not imported rows or vacant spaces.

Research portion of [#31](https://github.com/BinaryDevil/find-free-parking/issues/31). Adapter implementation remains blocked by [#11](https://github.com/BinaryDevil/find-free-parking/issues/11); this inventory defines evidence requirements, not a new schema or API contract. Approval is [#50](https://github.com/BinaryDevil/find-free-parking/issues/50). No source approval, registry change, loading, database write, city contact or production action occurred.

**Jurisdiction:** City of North Vancouver (`cnv.org` / `gisext2.cnv.org`), not District of North Vancouver (`dnv.org` / GEOweb), Vancouver, or West Vancouver. District data cannot establish City street permission. Verify every future feature against jurisdiction and exact curb geometry.

## Evidence types

| Type | Source(s) | Search result / limit |
|---|---|---|
| E1 Block-level regulations | StaffMap Parking Regulations; current curbaccessparking views | Found curb polylines; schedule grammar, reuse and safety reconciliation pending. |
| E2 Meter / payment feed | pparking Pay Parking On Street; City pay page | Found pay curb lines, no per-record rates; not a complete standalone free-after-hours feed. |
| E3 Sign inventory | StaffMap Parking Signs | Found points; completeness and assignment to all applicable curb signs unproven. |
| E4 Zone polygons | StaffMap Permit Areas; ResidentPermitZones; Pay Parking Zones | Found eligibility/payment polygons; polygon interiors are not universal curb rules. |
| E5 Temporary restrictions | Street-use permit guidance | No precise public machine-readable active parking-reservation feed found in searches below. |
| E6 Lots / operators | pparking Pay Parking Off Street; TransLink directory | Found lot points; no complete accepted lot permission/rate/schedule feed. |
| E7 Bylaw default rule | Street and Traffic Bylaw 6234; City parking guidance | Found 72-hour guidance with unsigned exclusions; no qualifying signs-only-exceptions default. |
| Signals | Ticket/payment guidance; OSM context | No public City citation dataset found; absence of tickets/signs/meters never proves permission. |

### Discovery log (policy order)

1. [City maps catalogue](https://www.cnv.org/City-Hall/About/Maps), [parking hub](https://www.cnv.org/streets-transportation/parking), and City website searches for open data, parking and licence. Found CityMap and official topic maps/pages; no City parking open-data catalogue entry or explicit open reuse licence found. The [District GEOweb catalogue](https://www.geoweb.dnv.org/data/) is a different authority and excluded.
2. Ran the inspected read-only `scripts/discover_city_sources.ts --server https://gisext2.cnv.org/arcgis/rest/services`: 57 services, including crawl-only StaffMap, ResidentPermitParking and pparking layers below. The helper caps services at 2,000 and parking layers at eight per service; direct service metadata additionally resolved exact IDs. Public [CityMap](https://gisext2.cnv.org/citymap/) and City pages establish the official channel. ArcGIS Online parking searches found no City-owned hosted parking service/organization root; no hosted organization crawl could be established. This is a discovery limit, not proof no hosted service exists.
3. Ran discovery for both “City of North Vancouver” and “North Vancouver”. ArcGIS exact-City search: none; broad search: BCIT BMC_ParkingBoundaries, an institutional property source outside the City-street target. Socrata exact-City search returned unrelated US datasets; broad search returned none. These are rejected jurisdiction matches, not City sources.
4. Canada catalogue/web searches for North Vancouver parking found grant/program records, no additional authoritative City curb-rule feed. No regional/national source found that resolves City curb permission.
5. [TransLink Park and Ride](https://www.translink.ca/rider-guide/driving/park-and-ride): reviewed location directory; no City of North Vancouver facility listed. West Vancouver facilities cannot expand this City's Coverage.
6. [City parking regulations](https://www.cnv.org/Streets-Transportation/Parking/Parking-Rules-and-Regulations) and [consolidated Bylaw 6234](https://www.cnv.org/-/media/city-of-north-vancouver/documents/bylaws/consolidated/6234-c.ashx?la=en): unsigned driveway/hydrant/intersection/crosswalk exclusions prevent treating a general maximum as precise permission.
7. City ticket guidance and GIS/catalogue searches: no public geolocated citation feed found. No personal ticket lookup performed.
8. [Street-use permits](https://www.cnv.org/streets-transportation/street-use-permits) identify the channel for reserved curb/closures, but no request was sent. The current partial target does not claim full Coverage; E5 feed/precision questions are prepared in the human data-request ticket below.

## Reproducible method and reuse scope

All GIS endpoints below use native EPSG:26910 (metres). Query `?f=json` for fields/domains, `/query?where=1%3D1&returnCountOnly=true&f=json` for counts, and `/query` with explicit public `outFields`, `orderByFields=OBJECTID`, `resultOffset`, `resultRecordCount`, `returnGeometry=true`, `outSR=4326` for records. Page until `exceededTransferLimit` is false; first-page maxima are not source-wide freshness. Full paginated rules/sign checks returned 4,330/2,615 rows. Record IDs below are reproducible query selectors, not a promise of permanent export identity; validate GlobalID/semantic keys and geometry stability before imports.

Service `editingInfo.lastEditDate` was absent for these MapServer layers. Dates below are maxima of positive record-level timestamps, not inspection dates for every curb or successful runtime sync dates. Null and 1899 sentinel dates cannot establish freshness. The July 2024 observation in #2 is superseded for regulations by current record dates; the resident-space snapshot still needs over-24-month human re-review.

`/MapServer/info/iteminfo?f=json` reports empty `licenseInfo` for StaffMap, ResidentPermitParking, pparking and curbaccessparking. Copyright fields are also empty. [CityMap terms](https://gisext2.cnv.org/citymap/) disclaim accuracy/completeness; they do not grant an open reuse licence. Public query access, official authority and City page embeds do not authorize redistribution. All selected services remain **pending reuse permission with exact layer/view scope** in #50. No District or Vancouver licence is inherited. Fixtures must omit GIS editor/creator identities, eligibility addresses and unrelated administrative fields.

## Sources

### Parking Regulations (E1)

- Publisher/channel: City GIS, [StaffMap layer 133](https://gisext2.cnv.org/arcgis/rest/services/BaseMapServices/StaffMap/MapServer/133).
- Geometry/precision: curb polylines; block/side assignment and overlap with every applicable restriction must be validated.
- Records: **4,330**; maximum `GIS_EDIT_DATE` **2026-04-20**, `GIS_ATTR_DATE` **2026-04-15** (UTC).
- Fields: `OBJECTID`, `GlobalID`, `ZONE_ID` identifiers; `STATUS` lifecycle; `BLOCK_STREET` public block label; `SIGNTYPE` rule category; `PARKING_TIME` duration text; `RESTRICTIONS` schedule/conditions text; `EXEMPT_PARKING` exemption flag; `PARKING_TYPE` space orientation, not permission; `SUPPLY` capacity, not vacancy; `IMPLEMENTATION_AREA` planning flag, not approval; geometry and date fields. Do not interpret flags or missing values through guesses.
- Sample: OBJECTID **7774**, 100 W 3rd St, PAY PARKING, `4 HRS`, `9AM-9PM`, zone `PZN-004253`.
- Formats include `1 HR`, `15 MIN`, `4 HRS`, null; `9AM-6PM MON-FRI`, `8AM-5PM SCHOOL DAYS`, overnight and specialized conditions. Categories include no stopping/parking, fire, loading, accessible, electric, permit-exempt time limits/pay and unlimited.
- Reuse: pending, service metadata above.
- Spot check: ten-place table below; unresolved payment/sign and prohibition association discrepancies, not criterion-7 pass.
- May establish: precise current E1 rules after all criteria pass, including restrictions and explicitly supported free/time-limit rules.
- Unknown: blank/ambiguous schedule, school calendar, unsupported vehicle/permit exemption, uncertain lifecycle/planning state, overlaps, stale source or unresolved sign mismatch. “Unlimited” is not a permission default outside mapped curb segments.
- Verdict: **pending** semantics, precise assignments, reuse and independent zero-contradiction checks.

### Permit Areas (E4)

- Publisher/channel: City GIS, [StaffMap layer 136](https://gisext2.cnv.org/arcgis/rest/services/BaseMapServices/StaffMap/MapServer/136); [ResidentPermitZones layer 1](https://gisext2.cnv.org/arcgis/rest/services/Applications/ResidentPermitParking/MapServer/1) and layer 2 outlines are alternate representations.
- Geometry/precision: **14 polygons** in each representation; do not import outlines as additional zones.
- Freshness: no service edit date; queried StaffMap `GIS_ATTR_DATE` values all null. Published cadence/currentness requires confirmation.
- Fields: `ZONE_ID` permit area code (sample **W50**, OBJECTID 1), `GlobalID`, `STATUS`, `DESCRIPTION`, `COMMENTS`, `GEOM_SOURCE`, `GIS_ATTR_DATE`, `ATTR_SOURCE`; no enforcement days/hours/visitor allowance fields.
- Reuse: pending for exact selected view; no catalogue licence found.
- Spot check: permit curb candidates Keith/Delbruck below; exact polygon membership and signed zone entitlement still required, not passed.
- May establish: zone association and supported restrictions with published applicable curb/hours; never free outside a polygon or blanket permit-only inside it.
- Unknown: polygon eligibility versus signed space applicability, zone-to-curb join, visitor/time-limit/payment exemptions and freshness.
- Verdict: **pending** criteria 4–7; polygon geometry meets E4 minimum but does not establish signed curb permission.

### Resident Permit Parking Space (E1/E4-associated curb candidate)

- Publisher/channel: City GIS, [ResidentPermitParking layer 0](https://gisext2.cnv.org/arcgis/rest/services/Applications/ResidentPermitParking/MapServer/0).
- Geometry/records: **754 curb polylines**; maximum `GIS_EDIT_DATE` **2024-07-30**, over 24 months old; null attribute dates and negative sentinel timestamps occur.
- Fields: `OBJECTID`, `GlobalID_1`, `SIGNTYPE`, `PARKING_TIME`, `RESTRICTIONS`, `STATUS`, geometry/date fields; `PARKING_TYPE` orientation; `SUPPLY` and weekday/weekend occupancy fields are not permission or current vacancy. Values include `RE`, `RE - EXISTING`, `PAY PARKING - EWP`, `PAY PARKING EWP`, blank schedules, `2HRS`, `4HRS`.
- Sample: OBJECTID **1**, PAY PARKING - EWP, blank duration/restrictions, Existing; stable key `{5898A96A-D24D-4EC3-9514-78264D81AA58}`.
- Reuse: pending; no licence in service item metadata.
- Spot check: legacy codes cannot be assumed equivalent to current permit categories; current sign/zone checks and dated re-review outstanding.
- May establish: only reconciled current signed permit/pay/time-limit curb rules; no rule from occupancy or blank fields.
- Unknown: undocumented RE/EWP semantics, blank schedules, missing permit zone key, obsolete versus current geometries.
- Verdict: **pending** explicit freshness re-review and source-selection reconciliation, semantics, reuse and ten independent checks. Not selected as current canonical data merely because #31 names it.

### Pay Parking On Street (E2 with E1 curb geometry)

- Publisher/channel: City GIS, [pparking layer 3](https://gisext2.cnv.org/arcgis/rest/services/Applications/pparking/MapServer/3), [City pay guidance](https://www.cnv.org/Streets-Transportation/Parking/Pay-Parking).
- Geometry/records: **223 curb polylines**, no service/record edit date or published sync cadence established.
- Fields: `OBJECTID`, `ZONE_ID`, `SIGNTYPE` (PAY PARKING or PAY PARKING – EXCEPT WITH PERMIT), `PARKING_TIME` (`4 HRS` in this snapshot), `RESTRICTIONS` (`9AM-9PM`), `PARKING_TYPE`, `EXEMPT_PARKING`, `IMPLEMENTATION_AREA`, geometry. No rates, days, holiday policy or complete prohibitions in this view.
- Sample: **7774**, PZN-004253, pay, four hours, 09–21; compare regulation/sign table below.
- City page supplies tiered rates and registration conditions; it is not a per-record machine-readable tariff join. First 30 minutes requires registration even without payment. Confirm exact area, effective date, daily/holiday scope and applicability before adapter use; do not invent a numeric default rate.
- Reuse: pending GIS and page-derived tariff reuse scope.
- Spot check: W 3rd and Lonsdale disagree with nearby legacy signs; reconciliation outstanding.
- May establish: paid conditions on assigned curbs after approval. **No standalone free-after-hours inference:** this view lacks all applicable prohibition/time-limit semantics; combine approved complete E1 evidence and signed conditions.
- Unknown: exemptions, registration requirements, effective implementation state, rate tiers and other overlapping restrictions.
- Verdict: **pending** freshness, tariffs/semantics, source conflicts, reuse and independent checks.

### Parking Signs (E3)

- Publisher/channel: City GIS, [StaffMap layer 132](https://gisext2.cnv.org/arcgis/rest/services/BaseMapServices/StaffMap/MapServer/132).
- Geometry/records: **2,615 sign points**; full-snapshot maximum edit **2026-08-12**, attribute date **2026-08-25**. These maxima do not refresh old individual signs.
- Fields: `OBJECTID`, `GlobalID`, `UNITID`, `STATUS`, `UNITTYPE`, `SIGNTYPE`, `PARKING_TIME`, `RESTRICTIONS`, `SIGN_ORDER`, `EXEMPT_PARKING`, `OWNER`, `BLOCK_STREET`, installation/removal/inspection and GIS dates. Preserve ordering/curb direction only when documented; a nearby point is not an exact assignment.
- Sample: OBJECTID **578**, 1600 Mackay Ave, TIME LIMITED, 2 HR, 9AM-6PM; independent-layer probe below.
- Reuse: pending.
- Spot check: ten candidate comparisons below; incomplete fields and conflicting categories prevent approval.
- May establish: rules once every applicable sign is parsed and assigned to the exact curb side. No sign-completeness statement found.
- Unknown: missing sign fields, incomplete inventory, signs across a corner/opposite curb, direction/order, unsupported codes and stale individual records.
- Verdict: **pending** completeness, mapping, grammar, reuse and zero-contradiction checks.

### Current topic views and other candidates

- [curbaccessparking layer 1](https://gisext2.cnv.org/arcgis/rest/services/Applications/curbaccessparking/MapServer/1), layer 2 scale view and [curbaccessparking2 layer 1](https://gisext2.cnv.org/arcgis/rest/services/Applications/curbaccessparking2/MapServer/1): **1,173 lines** each, `OBJECTID`, `SIGNTYPE`, `PARKING_TIME`, `RESTRICTIONS`, geometry. Sample **2882**, ACCESSIBLE, 2 HR, 9AM-6PM. No edit date; empty licence. Current [City curb page](https://www.cnv.org/Streets-Transportation/Parking/Curb-Access-%2C-a-%2Camp%3B-Parking-Plan) links topic mapping. **Pending alternate E1 view**, not an extra independent check or additive Coverage; confirm view filters/effective changes and reconcile with StaffMap.
- [Pay Parking Zones layer 4](https://gisext2.cnv.org/arcgis/rest/services/Applications/pparking/MapServer/4): **7 polygons**, `Pay_Parking_Zone`, `GlobalID`, `GIS_EDIT_DATE`, geometry; E4 candidate, **pending** rates/curb applicability, dates/reuse and independent checks. Not a substitute for 223 pay curb lines.
- [Pay Parking Off Street layer 2](https://gisext2.cnv.org/arcgis/rest/services/Applications/pparking/MapServer/2): **28 points**, `LOT_NAME`, `ADDRESS`, `Operator`, `PAY_PARKING`, `RESTRICTION`, `STATUS`, capacity fields. Sample **1**, Advanced Parking Parkade, 1111 & 1113 Lonsdale Ave, paid, restriction `n/a`. **Rejected as import-ready E6:** no complete rates/hours/public-use conditions or freshness signal; geometry entrance accuracy and operator authority need checks. City publication does not make every private operator lot free/public. Reuse pending; separate operator inventory required before any adapter.
- [accessibleparking layer 0](https://gisext2.cnv.org/arcgis/rest/services/Applications/accessibleparking/MapServer/0): **158 points**, `PAY_PARKING`, `NUMBER_SPOTS`, `TIME_LIMIT`, `BLOCK_STREET`, geometry, photo link. **Rejected for general-driver permission:** specialized vehicle conditions and full schedules absent; no edit/reuse evidence. No ordinary free rule from capacity.
- [ResidentExemptParking layer 0](https://gisext2.cnv.org/arcgis/rest/services/Applications/ResidentExemptParking/MapServer/0) (**201 lines**) and layer 1 (**165 polygons**): legacy `ZONE_`/`SPECIFIC`/`TYPE` or `MAPZONE`/`STATUS`/`DESCRIPTION`/`ELIGIBLE_ADDRESS`, no complete schedules or freshness. **Rejected as current canonical feed** until legacy/current program reconciliation; omit eligibility-address details. Empty/unstated reuse and no independent checks passed.
- E7 [parking guidance](https://www.cnv.org/Streets-Transportation/Parking/Parking-Rules-and-Regulations) and Bylaw 6234 above: maximum 72 hours, additional unsigned exclusions. **Rejected as qualifying E7 permission default**; web/PDF guidance lacks precise rule geometry/stable record IDs and signs are not the only exceptions. No Verified Free from unsigned streets.
- [Street-use permit guidance](https://www.cnv.org/streets-transportation/street-use-permits) is an E5 discovery lead, **rejected as an active restriction feed**: no dated precise reservation records, IDs or daily sync endpoint. Freshness/geometry/schedule/reuse checks remain for any future feed.

## Ten independent official-layer location probes

Queried rules and signs separately, full pagination, then selected distinct public block labels covering all required classes. For each rule, compared the nearest sign point on the **same BLOCK_STREET** to its polyline, using local planar distance (longitude × 73,000 metres, latitude × 111,000 metres); candidates within 25 m. These ten nearest points lie on the line to rounding precision. This does **not** establish side/direction, sign completeness, or independent origin of the City's datasets. Exact record selectors are reproducible from endpoints above. Blank is unknown, not all-day.

| Rule OBJECTID / public block | Regulation duration / restriction | Independent sign OBJECTID / observation | Result / remaining check |
|---|---|---|---|
| 59 / 1000 Marine Dr | TIME LIMITED, 1 HR, 9AM-6PM | 471 TIME LIMITED, duration/schedule null | Category agreement only; missing independent hours. |
| 68 / 1600 Mackay Ave | TIME LIMITED, 2 HR, 9AM-6PM | 578 same category/duration/hours | Text agrees; exact curb/sign assignment still required. |
| 69 / 300 Mackay Rd | TIME LIMITED, 4 HR, null | 587 same category/duration, null | Agreement on limit; schedule unknown. |
| 3197 / 300 Hanes Ave | NO PARKING, null/null | 674 NO PARKING, null/null | Prohibition category agrees; scope/hours unconfirmed. |
| 3199 / 100 Donaghy Ave | NO PARKING, null/null | 699 NO PARKING, null/null | Prohibition category agrees; scope/hours unconfirmed. |
| 3191 / 900 W 1st St | NO STOPPING, null/null | 593 NO STOPPING, null/null | Category agrees; never infer free from missing schedule. |
| 7774 / 100 W 3rd St | PAY PARKING, 4 HRS, 9AM-9PM | 94 TIME LIMITED, 1 HR, 9AM-6PM | Unresolved payment/limit discrepancy; possible old sign record, not proof new pay rule is wrong. |
| 7786 / 200 Lonsdale Ave | PAY PARKING, 4 HRS, 9AM-9PM | 44 TIME LIMITED, 1 HR, 9AM-6PM | Same unresolved discrepancy; do not pick convenient source. |
| 241 / 600 W Keith Rd | TIME LIMITED – EXCEPT WITH PERMIT, 2 HR, 9AM-6PM | 1012 TIME LIMITED, 2 HR, 9AM-6PM | Limit agrees; independent permit entitlement missing. |
| 535 / 1300 Delbruck Ave | TIME LIMITED – EXCEPT WITH PERMIT, null/null | 3053 NO STOPPING, null/null | Safety-relevant category discrepancy or adjacent prohibition; exact assignment and coexistence required. |

**Criterion 7 remains pending.** Ten probes are performed, but not ten zero-contradiction safety confirmations. Permit candidates need polygon membership, signed area codes and published entitlement; pay candidates need current signs/effective dates; all need additional signs and precise side extents. City [permit guidance](https://www.cnv.org/Streets-Transportation/Parking/Resident-and-Visitor-Parking) corroborates the existence of time-limited/pay except-with-permit categories, not these ten locations individually. A polygon, thematic view of the same data, or global program page cannot clear a specific conflict.

## Acceptance assessment

| Criterion | Regulations | Permit Areas | Resident Space | Pay On Street | Signs |
|---|---|---|---|---|---|
| 1 Authority | Official City GIS | Official City GIS | Official City GIS | Official City GIS/page | Official City GIS |
| 2 Machine-readable/stable | Candidate; validate IDs/fields | Candidate GlobalID/zone | Candidate GlobalID_1 | Candidate zone/geometry | Candidate UNITID/GlobalID |
| 3 Precision | Curb mapping pending | Polygon minimum; curb rights pending | Curb mapping pending | Curb mapping pending | Every-sign assignment pending |
| 4 Schedule/conditions | Grammar/exemptions pending | No schedule fields | Legacy codes/blanks | Rates/days/prohibitions missing | Grammar/completeness pending |
| 5 Freshness signal | Record dates, heterogeneous | No populated signal established | July 2024: re-review | No signal established | Record dates, heterogeneous |
| 6 Reuse | Pending | Pending | Pending | Pending | Pending |
| 7 Independent checks | Conflicts/gaps pending | Signed membership pending | Currentness checks pending | Payment conflicts pending | Assignment/conflicts pending |

## Unknown areas, gaps and adapter requirements

- Present Coverage is **none**. A possible future partial target is only exact reconciled curb segments described above; no citywide or District claim. Lots, unnamed/unmapped curbs, polygon interiors without signed rules and unresolved records remain Unknown. Full Coverage needs precise E5 daily synchronization and all other policy prerequisites.
- Reuse/freshness/source-selection approval must precede loading. Existing #31 owns the four requested layer adapters; this research does not create duplicate tickets or lift #11. Optional sign/topic-view adapters remain a scoped follow-up under #31 after source selection, not an automatic enlargement of implementation.
- After #11 integration, record public fixtures for all ten selectors, rate/registration rules, permit and vehicle exceptions, overnight/school-day cases, null/sentinel dates and changed-field failures. Validate complete pagination, EPSG transformation, stable identity, status/planning filters and joins; a renamed/missing field stops sync and produces Unknown. Do not encode the draft requirements as an invented evaluator contract now.
- Do not blanket-restrict every eligible permit polygon: official program allows non-permit vehicles subject to signed time/payment rules. Permits exempt only matching signed areas and conditions. Preserve applicable specialized rules without guessing exemption from a Boolean flag.
- E1–E4 successful sync must be within seven days; E5 within 24 hours or temporary restrictions are unknown. Source maximum edit dates do not establish current runtime synchronization. Resolve records older than 24 months individually and source re-review as required.
- No new evidence type or policy change is proposed. Mixed permit/payment curbs, registration-required zero-cost periods, sparse schedules and stale thematic copies expose application questions covered by existing precision/condition/approval criteria. Keep them explicit until #50 resolves them.

## Tickets

- [#31 inventory and regulation adapters](https://github.com/BinaryDevil/find-free-parking/issues/31): existing adapter umbrella reused; inventory prepared now, adapters remain open and blocked by #11.
- [#50 human inventory/reuse approval](https://github.com/BinaryDevil/find-free-parking/issues/50): exact service scope, current-source selection, semantics, freshness re-review and zero-contradiction confirmations; approval unlocks only the stated subset and later #12 registry/coverage work.
- [#51 E5 human data-request preparation](https://github.com/BinaryDevil/find-free-parking/issues/51): no contact sent. Full Coverage is outside the present partial target.
- [#2 spec](https://github.com/BinaryDevil/find-free-parking/issues/2), [#11 evaluator](https://github.com/BinaryDevil/find-free-parking/issues/11), [#12 computed Coverage](https://github.com/BinaryDevil/find-free-parking/issues/12), [#15 sync](https://github.com/BinaryDevil/find-free-parking/issues/15): inventories and prepared fixtures are not adapter validation, deployment or production verification.
