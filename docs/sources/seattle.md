# Seattle, Washington: source inventory

> **Policy amendment (2026-10-20):** [ADR-0002](../adr/0002-evidence-source-policy.md) criterion 6 now tests official public retrieval without sign-in, payment or access-control bypass. Licence gaps and criterion-6 rejections in the dated observations below are historical and superseded; retain licence text for attribution. This amendment performs no fresh endpoint or safety check, approves no source and leaves Coverage none. All other evidence gaps and independent two-agent approval requirements remain.

Status: draft
Independent review: [2026-10-19 partial review](review-24-2026-10-19.md); [2026-10-21 reassessment](seattle-public-review-2026-10-21.md); [2026-10-23 reviewer re-check](seattle-review-2026-10-23.md), which records a per-criterion verdict for every candidate. No source approved; no Partial subset passes. The tested pre-registered Blockface + RPZ subset had 6 contradictions in 12 random spot checks under its pre-registered rule, 2 of them (permit hours) on criterion 7's listed fields, and `LOAD_` is empty citywide. Coverage remains none.
Timezone: America/Los_Angeles
Coverage verdict: none (no source approved; Seattle remains not covered)
Lots and park-and-rides (E6): see [seattle-lots.md](seattle-lots.md) ([#125](https://github.com/BinaryDevil/find-free-parking/issues/125)).
Policy: [Evidence Source Policy in #2](https://github.com/BinaryDevil/find-free-parking/issues/2)
Observed: 2026-10-09. Counts are live `returnCountOnly` query results, not counts imported or validated in our database. Edit times below are UTC service `editingInfo.lastEditDate`, not evidence that every rule was inspected that day.

Inventory assessment: complete against #20’s remote-only inventory criteria; source approval and integration remain pending.

This is the read-only inventory for [#20](https://github.com/BinaryDevil/find-free-parking/issues/20). It does not approve sources, load data, change the city registry, or establish deployment. No city contact or records request has been sent. The draft deliberately revises the spec's expectation of full Seattle Coverage: mixed curb uses, incomplete sign semantics, conflicting zone hours and unpaid temporary restrictions prevent that conclusion today.

## Evidence types

| Type | Source(s) | Search result / limit |
|---|---|---|
| E1 Block-level regulations | SDOT Blockface; Curb Space Categories; Paid Area Curb Spaces; Peak Hour Parking Restrictions | Found. Aggregate block sides need individual curb extents and all prohibitions; none approved. |
| E2 Meter / payment feed | SDOT Pay Stations | Found. Payment transactions/occupancy are signals, not a regulation feed. |
| E3 Sign inventory | SDOT Parking Signs | Found. Completeness and full sign-code semantics not established. |
| E4 Zone polygons | Restricted Parking Zone Areas layers 3/4; Parking Tiers | Found. Eligibility polygons are not proof that every curb is signed. |
| E5 Temporary restrictions | Temporary No Parking reservations; Temporary No Parking Unpaid | Found. Unpaid reservations are address points, not block-side extents. |
| E6 Lots / operators | Public Garages and Parking Lots; King County Metro and Sound Transit operator pages | Found candidates. City lot directory alone supplies no permission; operator pages need precise per-lot normalization. |
| E7 Bylaw default rule | Seattle Municipal Code Title 11 Part 7; SDOT 72-hour rule page | Found general limits, but no qualifying permission default: unsigned statutory restrictions also apply. |
| Signals | Paid Parking Transaction Data, occupancy/studies, 72hr Parking Ordinance Violations; Seattle Vehicle Infractions catalog | Found. No current, block-side citation feed established. Reports are not citations or permission. |

### Search log (policy order)

1. [Seattle Open Data](https://data.seattle.gov/) and its [parking catalog query](https://api.us.socrata.com/api/catalog/v1?search_context=data.seattle.gov&q=parking&limit=100); GIS dataset references in the portal and [SDOT Maps and Data](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/maps-and-data). Portal metadata checked directly through `/api/views/<id>.json`; GIS references have no tabular rows. The first broad `parking Seattle` Socrata query with `domains` returned no results; the corrected `search_context` query found the sources below.
2. [Seattle City GIS organization REST directory](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services?f=pjson): inspected parking/pay-station/Blockface/curbspace service candidates and their layers. [GIS proxy directory](https://gisrevprxy.seattle.gov/arcgis/rest/services?f=pjson) timed out; not a negative result. Additional service discovery needs a successful crawl before claiming exhaustive coverage.
3. [ArcGIS organization search](https://www.arcgis.com/sharing/rest/search?f=pjson&num=100&q=orgid%3AZOyb2t4B0UYuYNYH%20AND%20%28parking%20OR%20curb%20OR%20meter%29), plus Socrata catalog above. Search reached its 100-item cap; reviewed relevant parking services, not an exhaustive city GIS audit. Apps/web maps are presentation wrappers, not new independent evidence.
4. [Data.gov SDOT search](https://catalog.data.gov/dataset/?q=SDOT) and [SDOT GIS catalog](https://catalog.data.gov/dataset/sdot-gis-datasets): found republications of Seattle sources, not an additional national regulation source. No national dataset filling missing curb schedule/extent semantics found in these searches.
5. [King County Metro parking locations](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations), [Sound Transit parking](https://www.soundtransit.org/ride-with-us/parking) and Northgate facility pages: E6 candidates found. No citywide official free-public-lot feed with complete rules found in the city portal/SDOT directory and these agency pages.
6. [City Clerk code entry](https://www.seattle.gov/city-clerk/legislation-and-research/seattle-municipal-code-and-city-charter), [current code Part 7](https://library.municode.com/WA/Seattle/codes/Municipal_Code?nodeId=TIT11VETR_SUBTITLE_ITRCO_PT7STSTPALO), SDOT parking regulations and 72-hour page: no E7 default satisfying the policy's signs-only-exceptions requirement found.
7. City portal searches for parking, infractions and citation; [Seattle Vehicle Infractions](https://data.seattle.gov/dataset/Seattle-Vehicle-Infractions/jxcr-rhfz), 72-hour requests and [Court citation-search guidance](https://seattle.gov/courts/tickets-and-payments/my-car-got-booted/check-for-unpaid-tickets): no current geocoded block-side citation API established. No personal citation lookup performed.
8. No request sent. The needed clarifications are recorded under Unknown areas and linked to existing work; human approval remains in #24.

## Reuse terms and method

2026-10-13 follow-up: see the [#24 terms evidence and approval matrix](approval-seattle-vancouver.md). It records exact published scope leads and unresolved permissions; all verdicts below and draft status remain unchanged.

City GIS item `licenseInfo` is an accuracy disclaimer, not an explicit open licence. The SDOT items are owned by `Transportation_SeattleCityGIS`; the three City Light land-cover items below are owned by `CityLight_SeattleCityGIS`; the [City open-data portal](https://data.seattle.gov/) links its GIS portal, and the [City privacy/data page](https://www.seattle.gov/digital/privacy-data-and-security) describes portal data as free to use and share. This is supporting reuse evidence, **pending confirmation of its applicability to each GIS service in #24**; do not silently treat the disclaimer as permission. Some Seattle web pages initially returned HTTP 403 in the web reader. A standard HTTP reader subsequently retrieved the City reuse page and Blockface PDF successfully; ArcGIS JSON and portal metadata were read live. Reuse applicability still awaits #24 approval.

[Blockface metadata PDF](https://www.seattle.gov/documents/Departments/SDOT/GIS/Blockface_Elements%20OD.pdf) was retrieved and its five pages extracted with Poppler. It confirms payment rates in dollars per hour, time-band bounds in minutes after midnight, `PARKING_TIME_LIMIT` in minutes for the paid area, and RPZ fields as permit-address eligibility. Its weekly cadence is older documentation; the live service states nightly. Non-CSM loading/zone counts assume one space per sign, so those quantities cannot establish exact curb allocation. Endpoint inclusivity and sign-code semantics remain unconfirmed below. Do not use the repo's old seed mappings as authority.

For every GIS layer, metadata: `GET <endpoint>?f=pjson`; count: `GET <endpoint>/query?where=1%3D1&returnCountOnly=true&f=pjson`; records: `GET <endpoint>/query?where=<predicate>&outFields=<field list>&returnGeometry=false&f=pjson`. Page using IDs/offsets and check `exceededTransferLimit` (services cap responses); a first page is not the total inventory. Query joins below use `ELMNTKEY`; that key identifies a block side, not the entire opposite-side street. Re-fetch fixtures before adapter work because exports can renumber `OBJECTID`; prefer asset keys and composite reservation/curb IDs. Do not commit contact names/phones or driver report records.

## Sources

### SDOT Blockface (E1)

- Publisher / channel: SDOT, official Seattle GIS and [portal entry](https://data.seattle.gov/dataset/Blockface/sppq-j5q5).
- Endpoint: [Blockface](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Blockface/FeatureServer/1); [item](https://www.arcgis.com/home/item.html?id=b35fb25c8c93425980705474b5e82815).
- Geometry and precision: polyline, native EPSG:2926 feet, request `outSR=4326` for map coordinates. Metadata says CSM-managed dimensions are measured; others are approximate from arterial class.
- Records: 47,926 as of 2026-10-09; last edited 2026-10-09T13:53:13Z; published nightly refresh.
- Fields used: `ELMNTKEY` blockface key, `SEGKEY` street segment, `UNITDESC` street/intersections, `SIDE` curb side; `DISTANCE/END_DISTANCE/BLOCKFACE_LENGTH/WIDTH` linear placement; `CSM` management flag. `PARKING_CATEGORY` summary; `PAID_SPACES/RPZ_SPACES/TL_SPACES/UNRESTRICTED/NOPARK/NOSTOP/BUS/LOAD_/ZONE` inventory quantities, not full spatial rules or binary whole-curb permission. `WKD/SAT/SUN_RATE1..3` dollars-per-hour rate bands, `*_START1..3/*_END1..3` numeric payment windows (observed 480–659, 660–1019, 1020–1199); documented minutes after midnight, with observed last-minute endpoints; exact inclusivity must be confirmed before conversion. `START_TIME_*/END_TIME_*` human-readable schedule bounds; `PARKING_TIME_LIMIT` documented minutes for paid areas. `PEAK_HOUR` text may contain multiple windows; `RPZ_ZONE/RPZ_AREA` permit-address eligibility zone/area references, `PAIDAREA/SUBAREA` payment area. Missing, zero and null have different contexts; zero rate bands do not establish permission.
- Reuse terms: City GIS disclaimer plus portal-wide reuse statement above; pending #24 confirmation.
- Spot check: table A contains 17 distinct block sides against the independent official Parking Signs inventory. Mixed restrictions and incomplete payment signs found; expanded sign text confirms the sampled split peak windows, despite misleading structured time envelopes. No zero-contradiction approval claimed.
- May establish: E1 free/paid/restricted and limits only after exact curb extents, schedule semantics and competing rules are validated.
- Unknown cases: CSM=N approximate geometry; mixed paid/loading/no-parking portions; ambiguous peak windows; null or unsupported schedules; holiday/event overrides; any unparsed applicable sign.
- Verdict: **pending** criteria 3/4/6/7 (curb allocation, schedule reconciliation, reuse confirmation and safety checks). Whole-block free classification from the category is rejected.

### Restricted Parking Zone Areas (E4)

- Publisher / channel: SDOT official GIS; [portal entry](https://data.seattle.gov/dataset/Restricted-Parking-Zone-Areas/gcaz-mfgj). [Service](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Restricted_Parking_Zone_Areas/FeatureServer); [item](https://www.arcgis.com/home/item.html?id=f6f00c5cf9634d578d41156bf4a4679f).
- Endpoint: [Restricted Parking Zone Signed Blocks](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Restricted_Parking_Zone_Areas/FeatureServer/0); 0 records; last edited 2026-10-09T13:05:21Z.
- Endpoint: [Residents Eligible for Restricted Parking Zone Permits](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Restricted_Parking_Zone_Areas/FeatureServer/1); 4,463 records; last edited 2026-10-09T13:08:12Z.
- Endpoint: [Restricted Parking Zone A or B Husky Game Days](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Restricted_Parking_Zone_Areas/FeatureServer/3); 2 records; last edited 2026-10-09T13:09:06Z.
- Endpoint: [Restricted Parking Zones](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Restricted_Parking_Zone_Areas/FeatureServer/4); 35 records; last edited 2026-10-09T13:13:23Z.
- Geometry and precision: layers 3/4 are zone polygons; layer 1 is resident-eligibility blockface lines; layer 0 signed-block lines currently empty. Polygons/eligibility lines do not prove actual sign coverage.
- Fields used: polygon `RPZ_ZONE` zone number, `NAME`/`ZONE_NAME` name, `INEFFECT` natural-language enforcement schedule, `GLOBALID` export identifier, `LAST_EDITED_DATE` edit time; `RENEW/SUBSIDIES/WEBLINK` permit administration, not visitor limits. Eligibility layer `ELMNTKEY/RPZZONE/RPZAREA/RPZ_ZONE_AREA/INEFFECT` describes eligibility and schedule, not universal street permission. Permit fees `DECAL_*/GUESTPERMIT` are not parking hourly rates. Layer 3 A/B `INEFFECT=Husky Football Game Days` needs official event dates, not a weekly parser.
- Reuse terms: shared City terms evidence; pending #24.
- Spot check: table B checks ten distinct zone/block locations against official signs; zone 14 still differs from sign text; zone 22 has a new text/structured-hours discrepancy. Zone 25 text agrees with the polygon but differs from structured sign hours; expanded text fills missing hours for 35/32. Zone 13 has separate evening permit-only signs.
- May establish: E4 restrictions with published hours and corroborated visitor allowances on actually signed curbs. Never free outside a zone.
- Unknown cases: polygon-only membership; unsigned blocks; empty layer 0; zone/subarea differences; evening permit-only periods; A/B game days; missing visitor duration. Do not apply a blanket two-hour visitor rule: signs include four-hour allowances and permit-only periods.
- Verdict: **pending** criteria 4/6/7; observed contradictions prevent approval until reconciled with SDOT evidence and per-curb signs (#26/#24).

### SDOT Parking Signs (E3)

- Publisher / channel: SDOT official GIS; endpoint [Parking_Signs](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Signs/FeatureServer/0); [item](https://www.arcgis.com/home/item.html?id=de918034c876456cbf11e4b234985142).
- Geometry and precision: point events along a block face in EPSG:2926; placement fields are needed to resolve extent and arrows, not just nearest street.
- Records: 98,126 as of 2026-10-09; last edited 2026-10-09T13:17:34Z; published daily refresh.
- Fields used: `COMPKEY/UNITID` asset keys, `ELMNTKEY/SEGKEY` blockface/segment join, `DISTANCE/WIDTH` placement, `UNITDESC/FACING` location/orientation, `SIGNTYPE/CATEGORY/CATEGORYDESCR` regulatory code/class; `STANDARDTEXT/CUSTOMTEXT/CUSTOM/FIELDNOTES` potential text, frequently null in sampled records. The [Parking Features sign view](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Features/FeatureServer/4) exposes fuller `TEXT`; join the same `UNITID`, check status and reconcile it with structured fields. This is recorded sign text, not a photograph of the currently posted sign. `STARTDAY/ENDDAY` numeric strings observed 1–5, 1–6, 1–7 (apparently weekday ranges; day mapping unconfirmed); `STARTTIME/ENDTIME` HHMM strings such as 700/1800/2359 and overnight 1800/0, **not Blockface's minute units**. Code suffixes and split-window sign codes require an official dictionary; a 600–1900 envelope cannot replace split rush hours.
- Reuse terms: shared City terms evidence; pending #24.
- Spot check: table A cross-checks signs against Blockface categories/limits; table B checks RPZ signs against zone hours. The same underlying SDOT asset system limits independence: these are second official layers permitted by the policy, not field observations. No photographs or completeness audit performed.
- May establish: E3 only when every applicable sign on a curb portion is parsed and assigned. Absence of signs is never free.
- Unknown cases: null text; unknown day codes; arrows/extents; split schedules/holiday exceptions; missing signs; unparsed vehicle/load-zone signs; conflicting zone schedules.
- Verdict: **pending** criteria 3/4/6/7, including completeness and official code semantics; cannot be used as complete E3 + E7 citywide Coverage.

### SDOT Pay Stations (E2)

- Publisher / channel: SDOT official GIS and [portal entry](https://data.seattle.gov/dataset/SDOT-Pay-Stations/y6ip-emxc); endpoint [SDOT_Pay_Stations](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Pay_Stations/FeatureServer/0); [item](https://www.arcgis.com/home/item.html?id=a628092ecd4741e6a11877ce7211795b).
- Geometry and precision: equipment points, EPSG:2926; join `ELMNTKEY` to a curb allocation. A payment machine location is not a parking-space footprint.
- Records: 1,630 as of 2026-10-09; last edited 2026-10-09T13:35:15Z.
- Fields used: `COMPKEY/UNITID` asset identifiers, `CURRENT_STATUS` service status (`INSVC` sampled), `ELMNTKEY/SEGKEY/SIDE/DISTANCE/WIDTH/UNITDESC` placement; `PAIDAREA/SUBAREA` area; `WKD/SAT/SUN_RATE1..3`, `*_START1..3/*_END1..3`, `START_TIME_*/END_TIME_*` rate windows as in Blockface; `PEAK_HOUR` restriction text. No complete no-parking/loading/visitor time-limit fields in this feed.
- Reuse terms: shared City terms evidence; pending #24.
- Spot check: table C, ten distinct stations/curbs; all weekday rate/start/end bands match Blockface where compared. This validates consistency of replicated schedules. Table K additionally compares ten stations with SDOT’s independently published numeric rate table; prohibition coverage and exact schedule boundaries remain unresolved.
- May establish: paid rates/hours when validated and placed precisely. **Rejected for standalone after-hours free under E2:** same feed lacks complete prohibitions and time limits (policy E2 limit), even with a null peak flag.
- Unknown cases: inactive equipment; ambiguous minute endpoints; holidays/events; full curb extents and non-payment restrictions. Never free on nearby unmetered curbs.
- Verdict: **pending** for paid-only use criteria 3/4/6/7; standalone free use rejected. Incorporate the payment join under #25 rather than seed separately.

### Temporary No Parking reservations (E5)

- Publisher / channel: SDOT official GIS, [current portal entry](https://data.seattle.gov/dataset/Temporary-No-Parking-Reservations-Current/ktrw-vxt6); [item](https://www.arcgis.com/home/item.html?id=dd379f4f60294aea9d813185fb5144a4).
- Endpoint: [Temporary No Parking Reservations (Current)](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Temporary_No_Parking_1/FeatureServer/0); 940 records; edited 2026-10-09T17:13:37Z.
- Endpoint: [Temporary No Parking Reservations (Past, Current, and Future)](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Temporary_No_Parking_1/FeatureServer/1); 2,971 records; edited 2026-10-09T17:13:37Z.
- Endpoint: [Temporary No Parking Reservations (All)](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Temporary_No_Parking_1/FeatureServer/2); 83,104 records; edited 2026-10-09T17:13:49Z.
- Geometry and precision: curb-space polylines EPSG:2926, often multiple spaces per reservation. Stable provenance needs `TNP_RECORD_ID` plus `CURBSPACE_NUMBER`/geometry, not reservation ID alone.
- Fields used: `ELEMENT_KEY` string blockface join, `CURBSPACE_NUMBER` space identifier, `TNP_RECORD_ID` reservation; `NOPARKING_SIGN_TYPE` red 24-hour, black long-term, barricade/custom time; `START_DATE_TIME/END_DATE_TIME` scheduled bounds, `ACTUAL_START_TIME/ACTUAL_END_TIME` actual bounds, `RECORD_STATUS` issuance, `PUBLICNOTICEPOSTDATETIME` notice, `MODIFIED_DATE_TIME` source record edit. ArcGIS date-field metadata says UTC; preserve epoch instants and display/evaluate in America/Los_Angeles. Custom daily schedules and precedence of actual/scheduled bounds need documented semantics; never fill null end times with guessed durations. Omit contact fields.
- Reuse terms: shared City terms evidence; pending #24.
- Spot check: table D, ten distinct curb locations joined to Blockface; location association succeeds. Comparison with Parking Features layer 3 is a second view of the same reservation source, not an independent confirmation that signs are posted or the closure is active. No independent reservation schedule confirmation found; criterion 7 remains pending.
- May establish: active restriction override only, never free. Query current and past/current/future layers appropriately for planned times; service descriptions use actual times and buffered date filters, so “Current” is not itself the evaluator's active-at-selected-instant predicate.
- Unknown cases: custom-time barricades; cancelled/ended records; null actual bounds; requested versus actual schedule; multi-space allocations; unpaid reservations outside this feed. Sync within 24 hours is required by #2; no runtime sync implemented here.
- Verdict: **pending** criteria 4/6/7, with unpaid E5 coverage gap. #27 must not treat the current-feed count as citywide temporary coverage.

## Spot checks

All checks below were performed against live official layers on 2026-10-09. Tables A–D retain public rule/asset identifiers and street descriptions, not driver locations. For reproduction, query the named layer with `ELMNTKEY=<key>` (or TNP `ELEMENT_KEY='<key>'`), and sign `COMPKEY=<id>`. Use all signs/curb spaces on the side before classification, not only the representative IDs printed below. Agreement on one field is not a passed source approval.

### A. Blockface ↔ Parking Signs (17 distinct sides)

| ELMNTKEY | Place / side | Blockface observation | Independent official sign observation | Result |
|---|---|---|---|---|
| 62009 | NE 42ND ST BETWEEN 11TH AVE NE AND 12TH AVE NE, N | Paid Parking; limit 240; peak null | 526933 R7-NP, 840238 R7-NPR, 840227 R8-PAY6, 840239 R8-PAY6 | Category/related restriction present; full sign extent pending |
| 70725 | 2ND AVE BETWEEN YESLER WAY AND JAMES ST, SW | Paid Parking; limit 120; peak 6-9AM 3-7PM | 167673 R8-PAY6, 275128 R7-STAPBD, 275130 R7-STAPBD, 167672 R8-PAY6 | Expanded R7-STAPBD text confirms 06–09 and 15–19, excluding Saturdays/Sundays/holidays; structured 0600–1900 envelope must not be parsed as continuous |
| 31497 | ALASKAN WAY BETWEEN BLANCHARD ST AND XW BELL ST, SW | Paid Parking; limit None; peak null | 164198 R8-PLZSTP, 83432 R8-PLZ, 164197 R8-PLZSTP, 606807 R8-PLZSTP | Paid summary not corroborated by sampled payment signs; unresolved, Unknown |
| 88477 | S HUDSON ST BETWEEN 37TH AVE S AND RAINIER AVE S, N | Paid Parking; limit 120; peak null | 629002 R7-NPL, 698255 R8-DISABLX, 629004 R8-2HR, 629000 R8-2HRL | Paid summary not corroborated by sampled payment signs; unresolved, Unknown |
| 14366 | E LYNN ST BETWEEN MINOR AVE E AND YALE AVE E, S | Restricted Parking Zone; limit 120; peak null | 125239 R8-2HZ8, 125237 R8-2HZ8, 682453 R7-NPR, 682472 R7-NPL | Category/related restriction present; full sign extent pending |
| 33434 | GREENWOOD AVE N BETWEEN N 36TH ST AND N 39TH ST, E | Restricted Parking Zone; limit 120; peak null | 487569 R8-2HRR, 488057 R8-2HZ27, 488077 R8-2HZ27, 488062 R8-2HZ27 | Category/related restriction present; full sign extent pending |
| 14362 | E LYNN ST BETWEEN FAIRVIEW AVE E AND MINOR AVE E, S | Restricted Parking Zone; limit 120; peak null | 886752 R8-2HZ8, 855798 R8-2HZ8, 855795 R7-NPR, 682467 R7-NPL | Category/related restriction present; full sign extent pending |
| 1625 | 12TH AVE NE BETWEEN NE 71ST ST AND NE 72ND ST, W | Restricted Parking Zone; limit 120; peak null | 844350 R8-2HZ19, 844352 R8-2HZ19, 844355 R8-2HZ19, 844354 R7-NPL | Category/related restriction present; full sign extent pending |
| 8281 | 7TH AVE NE BETWEEN NE 117TH ST AND DEAD END 3, W | Time Limited Parking; limit 240; peak null | 80010 R8-4HR, 80012 R8-4HR, 80009 R8-4HR, 80011 R8-4HR | Category/related restriction present; full sign extent pending |
| 29021 | 4TH AVE NE BETWEEN NE 115TH ST AND NE 117TH ST, W | Time Limited Parking; limit 240; peak null | 72044 R8-4HR, 72043 R8-4HR, 72046 R8-4HR, 72045 R8-4HR | Category/related restriction present; full sign extent pending |
| 82237 | E MADISON ST BETWEEN 22ND AVE E AND 23RD AVE E, NW | Time Limited Parking; limit 120; peak null | 917858 R7-NPL, 917853 R7-NPR, 917859 R8-2HR, 917861 R7-STOPS | Category/related restriction present; full sign extent pending |
| 11009 | HOWE ST BETWEEN TAYLOR AVE N AND DEAD END 1, N | No Parking Allowed; limit None; peak null | 350604 R7-NP, 350605 R7-W, 350602 R7-NP, 350603 R7-E | Category/related restriction present; full sign extent pending |
| 125319 | 9TH AVE S BETWEEN DEAD END AND S JACKSON ST, E | No Parking Allowed; limit None; peak null | 508446 R7-NP | Category/related restriction present; full sign extent pending |
| 8613 | 9TH AVE BETWEEN HOWELL ST AND STEWART ST, SW | No Parking Allowed; limit None; peak null | 727983 R8-CHRTR, 727979 R8-CHRTR, 338371 R7-STOPS, 727984 R8-CHRTR | Category/related restriction present; full sign extent pending |
| 70726 | 2ND AVE BETWEEN YESLER WAY AND JAMES ST, NE | Paid Parking; limit 30; peak 6-9AM 3-7PM | 619352 R8-CLZSTX, 619353 R8-CLZSTX, 619348 R7-NP, 619349 R7-NP | Commercial/passenger loading coexists; do not classify whole side free |
| 1034 | 1ST AVE BETWEEN BROAD ST AND EAGLE ST, NE | Paid Parking; limit 240; peak 6-9AM 3-7PM | 628899 R7-STAPBD, 628901 R7-STAPBD, 91036 R7-STOPS, 275355 R8-4PAYB8 | Expanded R7-STAPBD text confirms 06–09 and 15–19, excluding Saturdays/Sundays/holidays; structured 0600–1900 envelope must not be parsed as continuous |
| 1033 | 1ST AVE BETWEEN BROAD ST AND EAGLE ST, SW | No Parking Allowed; limit None; peak 7-9AM | 850094 R8-PLZ, 850090 R8-PLZ | Category/related restriction present; full sign extent pending |

### B. RPZ zone hours ↔ Parking Signs (10 zones)

| Zone | Place / side; ELMNTKEY | Polygon INEFFECT | Independent sign check | Result |
|---|---|---|---|---|
| 12 | EVERETT AVE E BETWEEN E BOSTON ST AND E LYNN ST, W; 10329 | Monday-Friday 7 AM to 6 PM | 705708 R8-2HZ12 700–1800; 705713 R8-2HZ12 700–1800 | Hours agree; 2-hour code requires dictionary |
| 25 | WESTLAKE EAST RDWY AVE N BETWEEN HIGHLAND DR AND COMSTOCK ST, E; 81510 | Monday – Friday 9 AM to 4 PM | 585196 R8-BL7Z25 0800–1800; 585197 R8-BL7Z25 0800–1800 | Expanded R8-BL7Z25/R8-PBSZ25 text says pay 09–16 Monday–Friday, agreeing with polygon; structured 08–18 differs, unresolved field semantics |
| 14 | 25TH AVE BETWEEN E SPRUCE ST AND E ALDER ST, W; 26613 | Monday-Friday 7 AM to 6 PM.  Every Day 6 PM to Midnight | 62249 R8-2HZ14 700–1600; 62245 R8-2HZ14 700–1600 | Conflict zone 07–18 plus evening versus sign 07–16; Unknown |
| 35 | SW OREGON ST BETWEEN 44TH AVE SW AND GLENN WAY SW, S; 67758 | Monday-Saturday 7 AM - 6 PM | 760495 R8-2HZ35 None–None; 760492 R8-2HZ35 None–None | Expanded text confirms 2 hours 07–18 except Sundays/holidays; structured hours null |
| 19 | 12TH AVE NE BETWEEN NE 71ST ST AND NE 72ND ST, W; 1625 | Monday-Friday 7 AM – 7 PM | 844350 R8-2HZ19 700–1900; 844352 R8-2HZ19 700–1900 | Hours agree; 2-hour code requires dictionary |
| 13 | 2ND AVE W BETWEEN W MERCER ST AND W ROY ST, W; 48081 | Every Day, 7AM to Midnight | 848356 R7-RPZ13 1800–0; 848359 R7-RPZ13 1800–0 | Split 07–18 visitor and 18–00 permit-only signs; polygon summary alone insufficient |
| 28 | 17TH AVE S BETWEEN BEACON AVE S AND S STEVENS ST, E; 47674 | Monday-Friday 7 AM – 6 PM | 504684 R8-4HZ28 700–1800; 504682 R8-4HZ28 700–1800 | 07–18 agrees; four-hour code, not two-hour default |
| 21 | E OLIVE ST BETWEEN CRAWFORD PL AND SUMMIT AVE, S; 14638 | Check Signs.  In unpaid parking areas, Daily 7 AM – 10 PM or Monday-Saturday 7 AM – 6 PM.  In paid parking areas, RPZ hours match paid parking hours, Monday-Saturday 8 AM – 8 PM or 8 AM – 6 PM.  | 530442 R8-2HZ21A 700–1800; 530445 R8-2HZ21A 700–1800 | Sample 07–18 within published alternatives; select signed subset, not blanket hours |
| 32 | E MERCER ST BETWEEN BELMONT AVE E AND BOYLSTON AVE E, S; 59878 | Monday - Saturday 7 AM - 8 PM | 694705 R8-2HZ32 None–None; 694704 R8-2HZ32 None–None | Expanded text confirms 2 hours 07–20 except Sundays/holidays; structured hours null |
| 22 | CARR PL N BETWEEN N 36TH ST AND N 37TH ST, W; 32401 | Monday – Friday 7 AM to 4 PM.  Area 2 Monday - Friday 8 AM to 5 PM | 617408 R8-2HZ22 700–1600; 617406 R8-2HZ22 700–1600 | Expanded R8-2HZ22 text says 2 hours 07–18 Monday–Friday, contrary to structured 07–16 and main polygon; Unknown |

### C. Pay Stations ↔ Blockface (10 distinct sides)

Compared all three weekday rate/start/end triples, not Saturday/Sunday or holiday schedules. Matching values do not establish a safe after-hours free rule.

| Station COMPKEY | Place / side | ELMNTKEY | First weekday rate and numeric window | Check |
|---|---|---|---|---|
| 529836 | NE 40TH ST 0140 BLOCK N SIDE ( 173) 173 FT E/O UNIVERSITY WAY NE (NE40-14-16) | 39293 | 1; 480–659 | All weekday bands agree |
| 528138 | 1ST AVE 0260 BLOCK SW SIDE ( 113) 113 FT NW/O VINE ST (01-26-09) | 68917 | 1; 480–659 | All weekday bands agree |
| 510292 | 9TH AVE 0200 BLOCK SW SIDE ( 274) 274 FT NW/O VIRGINIA ST (09-20-25) | 53805 | 2.5; 480–659 | All weekday bands agree |
| 504906 | JOHN ST 0050 BLOCK N SIDE (  84) 84 FT E/O 5TH AVE N (N2-05-06) | 33741 | 1; 480–659 | All weekday bands agree |
| 339352 | 9TH AVE N 0030 BLOCK W SIDE ( 210) 210 FT N/O THOMAS ST (N09-03-17) | 31313 | 1; 480–659 | All weekday bands agree |
| 591312 | 6TH AVE 0150 BLOCK NE SIDE ( 188) 188 FT NW/O PIKE ST (06-15-14) | 30698 | 2.5; 480–659 | All weekday bands agree |
| 668598 | 13TH AVE 0150 BLOCK W SIDE ( 206) 206 FT N/O E PIKE ST (E13-15--19) | 1821 | 1; 480–659 | All weekday bands agree |
| 828938 | 4TH AVE W 0032 BLOCK W SIDE (  51) 51 FT N/O ELLIOTT AVE W (W04-03-03) | 6357 | 1; 480–659 | All weekday bands agree |
| 282389 | BATTERY ST 0030 BLOCK NW SIDE (  83) 83 FT NE/O 3RD AVE (24-03-04) | 31893 | 1; 480–659 | All weekday bands agree |
| 336536 | FAIRVIEW AVE N 0020 BLOCK E SIDE ( 170) 170 FT N/O JOHN ST (NFV-02-14) | 33146 | 1; 480–659 | All weekday bands agree |

### D. Temporary reservations ↔ Blockface (10 distinct sides)

Independent Blockface establishes street-side association, **not** the closure's active schedule. The general [SDOT temporary-zone instructions](https://seattle.gov/transportation/permits-and-services/permits/tnp) establish what a temporary restriction means, but do not independently verify these ten reservations. Therefore these location checks do not pass the source's schedule spot-check gate.

| Reservation / curb space | ELMNTKEY | Independent Blockface location / side | Source bounds (UTC) / type | Result |
|---|---|---|---|---|
| SDOT-TNP-00-15066 / MR-08-19 | 11865 | MINOR AVE BETWEEN COLUMBIA ST AND MARION ST, SW | 2022-01-31T16:00:00Z to 2027-03-17T23:00:00Z; BLACK: long-term construction | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-15072 / 7-11-00 | 77561 | CHERRY ST BETWEEN BOREN AVE AND MINOR AVE, NW | 2022-02-21T16:00:00Z to 2027-03-17T23:00:00Z; BLACK: long-term construction | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-15072 / 8-11-01 | 32558 | COLUMBIA ST BETWEEN BOREN AVE AND MINOR AVE, SE | 2022-02-21T16:00:00Z to 2027-03-17T23:00:00Z; BLACK: long-term construction | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-15066 / 9-12-01 | 34310 | MARION ST BETWEEN MINOR AVE AND BOYLSTON AVE, SE | 2022-01-31T16:00:00Z to 2027-03-17T23:00:00Z; BLACK: long-term construction | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-15066 / 9-12-10 | 34309 | MARION ST BETWEEN MINOR AVE AND BOYLSTON AVE, NW | 2022-01-31T16:00:00Z to 2027-03-17T23:00:00Z; BLACK: long-term construction | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-46442 / NE12-45-32 | 46766 | 12TH AVE NE BETWEEN NE 45TH ST AND NE 47TH ST, E | 2026-10-09T15:00:00Z to 2026-10-09T23:00:00Z; BARRICADE: custom time limit | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-46443 / NE15-45-48 | 25042 | 15TH AVE NE BETWEEN NE 45TH ST AND NE 47TH ST, E | 2026-10-09T15:00:00Z to 2026-10-09T23:00:00Z; BARRICADE: custom time limit | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-46448 / 13-05-06 | 58501 | UNIVERSITY ST BETWEEN 5TH AVE AND 6TH AVE, NW | 2026-10-07T23:00:00Z to 2026-10-09T15:00:00Z; BARRICADE: custom time limit | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-46461 / N6-03-14 | 57077 | MERCER ST BETWEEN 3RD AVE N AND 4TH AVE N, N | 2026-10-09T15:00:00Z to 2026-10-11T23:00:00Z; BARRICADE: custom time limit | Block-side join found; schedule/sign posting unverified |
| SDOT-TNP-00-46479 / 02-07-10T | 2778 | 2ND AVE BETWEEN CHERRY ST AND COLUMBIA ST, NE | 2026-10-08T15:00:00Z to 2026-10-13T23:00:00Z; BARRICADE: custom time limit | Block-side join found; schedule/sign posting unverified |

### E. Supplemental curb-source probes at ten independently identified places

The ten table-A places below include paid, permit and time-limited cases. Each named source was queried separately by the Blockface key; cells are record counts, not matching rules. The independent Blockface/Signs observations are in table A. These probes reveal that several supplemental feeds have no records at signed RPZ/time-limited places; they therefore cannot replace the primary sources. Zero is missing evidence, never unrestricted permission. Day/extent validation remains incomplete; none passes approval from these probes.

| ELMNTKEY (place in A) | Curb categories | Paid curb spaces | Symbology view | Reserve view | Peak restrictions | Parking categories | Transit layover |
|---|---|---|---|---|---|---|---|
| 62009 | 16 | 16 | 16 | 6 | 0 | 1 | 0 |
| 70725 | 13 | 13 | 13 | 3 | 1 | 1 | 0 |
| 31497 | 10 | 10 | 10 | 0 | 0 | 1 | 0 |
| 88477 | 23 | 23 | 23 | 6 | 0 | 1 | 0 |
| 14366 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 33434 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 14362 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 1625 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 8281 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| 29021 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |

### F. Rejected lot and unpaid-reservation samples

Ten initial lot records were checked for usable operator/hours/rate evidence; all ten have null `HRS_MONFRI`, `RTE_1HR` and `OP_WEB`. No independent official operator rule could be established from those fields, so they remain unverified. This is a recorded failed/insufficient check, not ten passed E6 checks. Query by `BUSLIC_ID` to reproduce.

| BUSLIC_ID | Named facility / address | Independent permission check |
|---|---|---|
| 666877 | DIAMOND PARKING  WX04; 4333 FREMONT AVE N, SEATTLE, WA 98103 | Not established: operator URL and rule fields null; Unknown |
| 574590 | DIAMOND PARKING  WU15; 1919 N 45TH ST, SEATTLE, WA 98103 | Not established: operator URL and rule fields null; Unknown |
| 732098 | DIAMOND PARKING SERVICES WX33; 4301 11TH AVE NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 611676 | UNIVERSITY BOOK STORE PARKING; 4315 15TH AVE NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 57562 | U DISTRICT PARKING LOT 3B MANOR; 4236 BROOKLYN AVE NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 661194 | DIAMOND PARKING  WX01; 4244 8TH AVE NE, SEATTLE, WA 98115 | Not established: operator URL and rule fields null; Unknown |
| 591247 | DIAMOND PARKING  WU51; 4131 11TH AVE NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 535675 | DIAMOND PARKING  WU13; 4100 UNIVERSITY WAY NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 588668 | DIAMOND PARKING  WU46; 4244 11TH AVE NE, SEATTLE, WA 98105 | Not established: operator URL and rule fields null; Unknown |
| 684294 | DIAMOND  A617; 2003 W DRAVUS ST, SEATTLE, WA 98199 | Not established: operator URL and rule fields null; Unknown |

Unpaid TNP record probes below cover ten unique addresses. They were checked for block-side precision against the independent SDOT temporary-zone requirement; address/free-text locations do not provide machine-valid curb extents. No independent permit-specific posted-sign/schedule evidence was established. These are ten failed/insufficient location checks, not ten approved E5 rules. Query by `TNPN_RECORDID`; contact fields were excluded.

| Permit | Address | LOCATION evidence | Precision result |
|---|---|---|---|
| SDOT-TNPN-03-89757 | 123 N 136TH ST | 123 / 129 N 136TH ST | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-93501 | 14141 LINDEN AVE N | First two spots north and south of driveway | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-91959 | 14378 30TH AVE NE | The East side of 30th Ave NE | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-91718 | 13225 1ST AVE NW | Job#108667580 - BOTH SIDES OF 1ST AVE NW BETWEEN NW 132ND ST AND NW 135TH PL | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-92018 | 13203 4TH AVE NW | 4th Ave NW - WEST side, between N 132nd St and dead end (North) | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-90591 | 13023 GREENWOOD AVE N | Job#108665877 - BOTH SIDES OF THE GREENWOOD AVE N BETWEEN N 130TH ST AND N 132ND ST | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-92043 | 12755 GREENWOOD AVE N | South side of N 130th between Greenwood Ave N. and Palatine Ave N. | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-92013 | 1025 NE 133RD ST | NE 133rd St - SOUTH side, between 11th Ave NE and 10th Ave NE | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-91272 | 12736 33RD AVE NE | East Side of 12736 33rd Ave NE. Between NE 130th Street and NE 125th Street | Point/description insufficient for approved E5 allocation |
| SDOT-TNPN-03-92658 | 12544 27TH AVE NE | No parking within 50ft of sign on either side of 27th AVE NE between NE 127th ST and NE 125th ST (12544 27th Ave NE) 72603 | Point/description insufficient for approved E5 allocation |

### G. Parking Tiers ↔ ten official paid Blockface locations

Queried polygons intersecting the first vertex of each independently identified Blockface geometry in table C. A missing intersection can reflect boundary/vertex placement, not lack of paid parking. These are location/rate-area probes, not full polygon-wide permission or weekday/holiday checks.

| ELMNTKEY (place in C) | Tier polygon sample | Check |
|---|---|---|
| 39293 | University District/Core: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 68917 | Belltown/North: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 53805 | Denny Triangle/North: morning 2.5, 8AM–11AM | Location probe only; rule applicability unverified |
| 33741 | Uptown Triangle/None: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 31313 | South Lake Union/South: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 30698 | Commercial Core/Retail: morning 2.5, 8AM–11AM | Location probe only; rule applicability unverified |
| 1821 | Pike-Pine/None: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 6357 | Uptown/None: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 31893 | Belltown/North: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |
| 33146 | South Lake Union/South: morning 1, 8AM–11AM | Location probe only; rule applicability unverified |

## Other candidates and rejected uses

These sources were found during discovery and are retained so absence is not mistaken for approval. A source rejected at an earlier criterion has not received a ten-place approval check; that shortfall is stated, not silently passed. Additional GIS candidates share the City reuse uncertainty above. Endpoints are live JSON services; geometry uses EPSG:2926 unless noted.

### Temporary No Parking Unpaid

- Type: E5
- Publisher / channel: SDOT official GIS.
- Endpoint: [Temporary No Parking (Unpaid)](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Temporary_No_Parking_Unpaid/FeatureServer/10); records 1,199 as of 2026-10-09; last edited 2026-10-09T16:10:40Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=f486ed9dacf3488d94169f67fb48c931); City terms evidence above; pending #24.
- Geometry and precision: Point at permitted address. Address and free-text location do not identify a curb side/extent.
- Fields used: `TNPN_RECORDID` permit key; `PERMITTED_ADDRESS/MAF_ID/LOCATION` address/reference/free-text extent; `REQUESTED_STARTDATE/REQUESTED_ENDDATE` date range; `DAILY_START_TIME/DAILY_START_AMPM/DAILY_END_TIME/DAILY_END_AMPM` daily hours; `INCLUDE_SATURDAY/INCLUDE_SUNDAY/FULL_DAY_PARKING` applicability; `RECORD_STATUS` issuance and `MODIFIED_DATE_TIME` record edit. UTC date metadata must be reconciled with local daily time strings. Omit contact fields.
- May establish: Restriction candidate only; cannot establish free.
- Unknown cases, spot check and verdict: **rejected for direct E5 classification: criterion 3 fails (address point); criteria 4/6/7 remain unresolved. Example SDOT-TNPN-03-89757 at 123 / 129 N 136TH ST requests 7am–6pm including weekends; exact side/sign placement unverified. Table F provides ten unique-address probes, all insufficient for precise E5 allocation. #27/#24 must address this gap.**

### Curb Space Categories

- Type: E1 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Curb Space Categories](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Curb_Space_Categories/FeatureServer/6); records 40,538 as of 2026-10-09; last edited 2026-10-09T13:20:10Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=4a2fe0abbaa0468b90f841be631c798b); City terms evidence above; pending #24.
- Geometry and precision: Polyline curb subsegments; BLOCK_ST/BLOCK_END and side delimit individual uses.
- Fields used: `SPACEKEY` curb asset key, `ELMNTKEY/SEGKEY` joins, `BLOCK_ST/BLOCK_END/WIDTH_OFFSET/SPACELENGTH` placement; `SPACETYPE/SPACETYPEDESC/CATEGORY` use (paid, loading, no parking, etc.); `TIME_LIMIT` duration whose units need official definition; `CURRENT_STATUS` active state, `SPACE_NB` curb identifier, `PAIDAREA/SUBAREA` payment-area join. No full day/hour schedule fields.
- May establish: Curb-use allocation supplement under #25, not standalone permission.
- Unknown cases, spot check and verdict: **rejected as standalone E1: criterion 4 fails (no full schedule). Tables E/H provide ten presence probes and ten actual space/sign comparisons; full extents/schedules still need reconciliation under #25.**

### Paid Area Curb Spaces

- Type: E1/E2 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Paid Area Curb Spaces](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Paid_Area_Curb_Spaces/FeatureServer/0); records 40,538 as of 2026-10-09; last edited 2026-10-09T13:30:53Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=69af206729884701b32f5a810a1c6405); City terms evidence above; pending #24.
- Geometry and precision: Polyline curb subsegments. Despite the name, count equals Curb Space Categories; do not assume every returned row is paid.
- Fields used: Same `SPACEKEY/ELMNTKEY/SEGKEY`, `BLOCK_ST/BLOCK_END/SIDE`, `SPACETYPE/SPACETYPEDESC/TIME_LIMIT/CATEGORY/CURRENT_STATUS/SPACE_NB/PAIDAREA/SUBAREA` schema as Curb Space Categories; no independent payment schedule.
- May establish: Exact paid-curb geometry candidate, after categorical filters and official joins.
- Unknown cases, spot check and verdict: **rejected standalone: criterion 4 fails; Tables E/H provide ten presence probes and ten actual replicated space/sign comparisons; independent schedules/extents still unverified. Potential supporting geometry for #25, not a separate free adapter.**

### Curb Space Categories with Symbology (Active)

- Type: E1 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Curb Space Categories](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Curb_Space_Categories_with_Symbology_(Active)/FeatureServer/0); records 40,538 as of 2026-10-09; last edited 2026-10-09T13:20:10Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=018203ec2ed241f6b6bc85be2f7a2454); City terms evidence above; pending #24.
- Geometry and precision: Polyline cartographic view.
- Fields used: `ROWNBR/OBJECTID` view row IDs, `ELMNTKEY` block join, `BLOCK_ST/BLOCK_END/WIDTH_OFFSET/SPACELENGTH/SIDE` placement, `SPACETYPE/SPACETYPEDESC/TIME_LIMIT/CATEGORY/CURRENT_STATUS/SPACE_NB` uses. No SPACEKEY or complete schedule.
- May establish: Display context, not a separate source approval.
- Unknown cases, spot check and verdict: **rejected standalone: criterion 4 fails; stable view-ID semantics and extent checks unconfirmed. Table E provides presence probes; table J adds ten reduced-field record/sign comparisons, not complete rule validation. Metadata lastEditDate is newer than dataLastEditDate; do not confuse view refresh with rule edits.**

### Curb Space Reserve (Active)

- Type: E1 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Curb Space Categories](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Curb_Space_Reserve_(Active)/FeatureServer/0); records 12,630 as of 2026-10-09; last edited 2026-10-09T13:20:10Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=8c91829ccb624aa2a997fa4ecca4d5fd); City terms evidence above; pending #24.
- Geometry and precision: Polyline reserve-use view.
- Fields used: Same cartographic placement/use fields as symbology view; `ROWNBR` view row, `ELMNTKEY` block join, `TIME_LIMIT` requires units confirmation. No complete schedule.
- May establish: Reserve-use context, not universal public permission.
- Unknown cases, spot check and verdict: **rejected standalone: criterion 4 fails; Table E provides presence probes; table J adds ten actual reduced-field record/sign comparisons. Old dataLastEditDate differs from current lastEditDate; requires freshness interpretation/re-review.**

### Peak Hour Parking Restrictions

- Type: E1 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Peak Hour Parking Restrictions](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Peak_Hour_Parking_Restrictions/FeatureServer/3); records 492 as of 2026-10-09; last edited 2026-10-05T17:15:25Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=19f041b427604175810c0f294e77dfdf); City terms evidence above; pending #24.
- Geometry and precision: Polyline, side and linear offset.
- Fields used: `ELMNTKEY/SEGKEY/SIDE` curb join, `STPOINT/ENDPOINT/WID` placement; `PKHRCODE/PKHRDESC` restriction code/text, `CURRENT_STATUS` asset status. Example element 31454 PK-L, 7–9AM 4–6PM. Text supplies multiple times but no explicit weekday/holiday fields.
- May establish: Restriction supplement only; cannot establish free.
- Unknown cases, spot check and verdict: **rejected standalone: criterion 4 fails without weekday/holiday semantics; tables A/H reconcile expanded split-window text and record ten actual layer/sign comparisons, including missing or conflicting corroboration. Resolve supporting joins in #25.**

### Parking Categories

- Type: E1 summary
- Publisher / channel: SDOT official GIS.
- Endpoint: [Parking Categories](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Categories/FeatureServer/0); records 46,234 as of 2026-10-09; last edited 2026-10-09T13:27:03Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=258c084aa09a427fbb91197439e16e25); City terms evidence above; pending #24.
- Geometry and precision: Whole blockface polyline, including approximate non-CSM geometry.
- Fields used: Blockface-style `ELMNTKEY/UNITDESC/SIDE/CSM/PARKING_CATEGORY`, inventory counts, rate windows, `PEAK_HOUR/RPZ_ZONE/PARKING_TIME_LIMIT`; shares aggregate limitations.
- May establish: Summary/display context.
- Unknown cases, spot check and verdict: **rejected for independent source approval: mixed-curb category is insufficient under criteria 3/4; ten actual category/sign comparisons in table H and presence probes in E; same underlying dataset as parent Blockface, so agreement is not independent rule confirmation. Unrestricted category is not automatically verified free.**

### Parking Tiers

- Type: E4 paid-area supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Parking Tiers](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Tiers/FeatureServer/0); records 37 as of 2026-10-09; last edited 2026-10-09T13:28:32Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=4159ee278747484ab456576198b54263); City terms evidence above; pending #24.
- Geometry and precision: Paid-area polygons, not parking footprints.
- Fields used: `PAIDAREA/SUBAREA/TIER` area/rate tier, `SHORTRATE/LONGRATE/START_TIME/END_TIME` legacy summary, `MORNING_RATE/MORNING_START/MORNING_END`, `DAY_*`, `EVENING_*` rate/hour bands. Sample Westlake Ave N South morning 1, 9AM–11AM, day 1, 11AM–4PM. Weekday/holiday and individual curb exceptions absent.
- May establish: Payment-area context; never permission throughout polygon.
- Unknown cases, spot check and verdict: **rejected standalone: criterion 4 incomplete; Table G provides ten independent paid-location probes; complete per-curb rate applicability remains unverified. Blockface/Pay Stations preferred for curb-specific payment schedules.**

### Curbspace Transit Layover

- Type: E1 supplement
- Publisher / channel: SDOT official GIS.
- Endpoint: [Curbspace Transit Layover](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Curbspace_Transit_Layover/FeatureServer/0); records 283 as of 2026-10-09; last edited 2026-10-09T12:53:32Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=e3ade4fddd5a4cb38ae0a068b14be2fd); City terms evidence above; pending #24.
- Geometry and precision: Bus/reserved curb polylines.
- Fields used: `UNIQUEID/SPACEKEY/ELMNTKEY/SEGKEY/SIDE/BLOCK_ST/BLOCK_END` placement; `SPACETYPE/SPACETYPEDESC` use, `CURRENTSTATUSCD/STOPSTATUS` status; `STARTDAY/ENDDAY/STARTTIME1/ENDTIME1/STARTTIME2/ENDTIME2/PERIOD` schedule requiring documented codes, `ROUTES/STOPID` transit association. Sample UNIQUEID 93235 element 86061 BUSLAY, PERIOD=24, times null.
- May establish: Bus-only restriction context, never public free.
- Unknown cases, spot check and verdict: **rejected standalone public-parking source: no positive public permission; code semantics unverified; ten actual layer/sign comparisons in H identify bus-only windows and unresolved mixed extents; table E presence probes alone do not establish active bus restrictions. Preserve as Unknown/restricted input if incorporated into #25.**

### Public Garages and Parking Lots

- Type: E6 candidate
- Publisher / channel: SDOT official GIS.
- Endpoint: [Public Garages and Parking Lots](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Public_Garages_and_Parking_Lots/FeatureServer/1); records 700 as of 2026-10-09; last edited 2026-10-05T17:16:35Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=3029d63401544cd6b9783ef1bfb40b91); City terms evidence above; pending #24.
- Geometry and precision: Facility point/address; entrance/footprint precision not guaranteed.
- Fields used: `GlobalID/BUSLIC_ID/BUSLIC_LOCATION_ID` IDs; `DEA_FACILITY_NAME/DEA_FACILITY_ADDRESS/DEA_STALLS` facility/address/capacity, `HRS_MONFRI/HRS_SAT/HRS_SUN` hours; `RTE_1HR/RTE_2HR/RTE_3HR/RTE_ALLDAY` rate fields, `OP_NAME/OP_WEB/PAYMENT_TYPE` operator/payment, `OUTOFSERV/STATUS/DATETIME` status/update. Many nulls. `VACANT` is not a vacancy observation used by this service. Sample DIAMOND PARKING WX04, 4333 Fremont Ave N, 13 stalls, hours/rates/operator null.
- May establish: Directory geometry only until official operator permission/rates/conditions verified.
- Unknown cases, spot check and verdict: **rejected as E6 rule feed: criteria 3/4 incomplete; city directory is not the private operator permission. Table F records ten initial insufficient checks; table I adds ten directory/operator address/product matches, without complete short-term permission. Null price never means free.**

### Parking Features

- Type: presentation duplicates
- Publisher / channel: SDOT official GIS.
- Endpoint: [Parking Facilities](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Features/FeatureServer/0); records 700 as of 2026-10-09; last edited 2026-10-09T10:17:54Z.
- Endpoint: [Parking Signs](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Features/FeatureServer/4); records 97,678 as of 2026-10-09; last edited 2026-10-09T10:27:26Z.
- Endpoint: [Street Parking](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Features/FeatureServer/2); records 46,234 as of 2026-10-09; last edited 2026-10-09T10:21:19Z.
- Endpoint: [Temporary No Parking](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parking_Features/FeatureServer/3); records 83,068 as of 2026-10-09; last edited 2026-10-09T10:24:24Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=c599cc4b87bd411787ab88cd4e99fbda); no explicit licence recorded; pending permission, not approved.
- Geometry and precision: Point facilities/signs and blockface/reservation polylines.
- Fields used: Layer 0 facility name/address only; 4 sign `UNITID/ELMNTKEY/SIGNTYPE/CATEGORY/TEXT/CURRENT_STATUS`; 2 street summary `PARKING_CATEGORY/PEAK_HOUR/RPZ_ZONE/PAIDAREA`; 3 reservation `ELEMENT_KEY/NOPARKING_SIGN_TYPE/START_DATE_TIME/END_DATE_TIME/PUBLICNOTICEPOSTDATETIME`.
- May establish: Display views of other sources, not independent authoritative confirmation.
- Unknown cases, spot check and verdict: **rejected as a separate rule source: reduced schemas, mismatched counts to primary layers and missing reuse terms in item. Table D comparison does not establish independent active schedule. No independent ten-place approval check.**

### Driveways and Parking Lots

- Type: signal/context
- Publisher / channel: Seattle City Light official GIS.
- Endpoint: [Driveways and Parking Lots](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Driveways_and_Parking_Lots/FeatureServer/10); records 141,161 as of 2026-10-09; last edited 2024-03-07T19:55:33Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=b98de756b282485a9baee83856c159e2); no explicit licence recorded; pending permission, not approved.
- Geometry and precision: Impervious-surface polygons.
- Fields used: `GlobalID/OBJECTID` geometry identifiers, `IMP_TYPE_I/PERV_IMPERV/POLLUT_TYPE` surface classification, area/length.
- May establish: Land-cover context only.
- Unknown cases, spot check and verdict: **rejected E6: criterion 1 for parking permission and criterion 4 fail; geometry does not say public/free/hours. No approval spot check; data older than 24 months.**

### Driveways and Parking Lots Dissolved

- Type: signal/context
- Publisher / channel: Seattle City Light official GIS.
- Endpoint: [Driveways and Parking Lots Dissolved](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Driveways_and_Parking_Lots_Dissolved/FeatureServer/11); records 1 as of 2026-10-09; last edited 2024-03-07T21:38:49Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=29c897b2f9d642ea8d0372cabec65e66); no explicit licence recorded; pending permission, not approved.
- Geometry and precision: Single dissolved land-cover geometry.
- Fields used: `OBJECTID/Type/Shape__Area/Shape__Length` aggregate geometry.
- May establish: Land-cover context only.
- Unknown cases, spot check and verdict: **rejected E6: permission, individual-lot location and schedule fail criteria 1/3/4; no spot check. Data older than 24 months.**

### Parcels Within 10ft of Driveways and Parkings Lots

- Type: signal/context
- Publisher / channel: Seattle City Light official GIS.
- Endpoint: [Parcels Within 10ft of Driveways and Parkings Lots](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Parcels_Within_10ft_of_Driveways_and_Parkings_Lots/FeatureServer/1); records 140,023 as of 2026-10-09; last edited 2024-03-07T19:17:34Z.
- Reuse terms: [item terms](https://www.arcgis.com/home/item.html?id=171b624d920049539a50bcae9ac6d169); no explicit licence recorded; pending permission, not approved.
- Geometry and precision: Parcel polygons near impervious surfaces.
- Fields used: `PIN/MAJOR/MINOR` parcel IDs, `PRES_USE_DESC/ADDRESS` property-use/address, area/perimeter. Exclude taxpayer details.
- May establish: Property context only.
- Unknown cases, spot check and verdict: **rejected E6: proximity to a driveway/lot cannot establish public access or parking permission; criteria 1/4 fail. No spot check; data older than 24 months.**

### King County Metro / Sound Transit official operator pages (E6)

- Publisher / channel: transit agencies' own websites; [Metro locations](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations), [Metro Northgate project](https://kingcounty.gov/en/dept/metro/programs-and-projects/transit-oriented-communities/northgate), [Sound Transit Northgate garage](https://www.soundtransit.org/ride-with-us/parking/parking-locations/northgate-park-ride-northgate-station-garage), [Sound Transit parking rules](https://www.soundtransit.org/ride-with-us/parking) and [permits](https://www.soundtransit.org/ride-with-us/parking/parking-permits).
- Format / fields: HTML tables/text, facility name/address, number of spaces, routes, hours and eligibility notes. Stable machine record IDs, lot footprints/entrances and per-rule change timestamps not established. Count and edit date: no queryable Seattle-only rule count or source edit date exposed; retrieved 2026-10-09 (retrieval is not freshness).
- Geometry and precision: published address/garage level, not normalized footprint. Records mix Metro and Sound Transit operators; Metro's suspended permit program cannot be applied to Sound Transit reserved spaces.
- Spot check: Metro Green Lake 6601 8th Ave NE (411 spaces) and Airport & Spokane (25) are listed; Northgate C’s published free window is conditional: orange P2 spaces prioritize transit arrivals 6am–10am Monday–Friday; arrivals after 10am and weekends can incur fees after three complimentary hours. The 6am–8pm summary alone is insufficient. Its project page corroborates location but does not settle every arrival-time condition. Sound Transit Northgate garage publishes up-to-24-hour use and separate permits. These are four candidate places, **not ten independently checked E6 rules**; no additional qualifying Seattle ten-place sample established. No inference that every Northgate garage space is free.
- Reuse terms: public operator statements establish authority but not a reusable machine feed licence; pending explicit terms if an adapter is proposed. City open-data terms do not apply to these agencies.
- May establish: lot permission only for the operator's specified spaces, eligible users, hours and limits; never street rules or vacancy.
- Unknown cases: transit use eligibility, reserved stalls, different owners/garage levels, closures, exact entrance and current operator pricing.
- Verdict: **rejected as import-ready E6 feed** (criteria 2/3/5/6/7 unestablished). Preserve as authoritative research leads; no lot adapter or Coverage claimed by #20.

### Seattle municipal code / 72-hour guidance (E7 candidate)

- Publisher / channel: City Clerk's linked current municipal code; [Title 11 Part 7](https://library.municode.com/WA/Seattle/codes/Municipal_Code?nodeId=TIT11VETR_SUBTITLE_ITRCO_PT7STSTPALO), [SDOT 72-hour guidance](https://seattle.gov/transportation/projects-and-programs/programs/parking-program/parking-regulations/72-hour-on-street-parking-ordinance), [parking regulations](https://seattle.gov/transportation/projects-and-programs/programs/parking-program/parking-regulations).
- Endpoint / fields / records: HTML code sections, section identifier/text; §11.72.440 maximum 72 hours unless a shorter posted period or law applies. One default-limit provision reviewed; no machine rule count/edit date exposed. Code adoption/effective-date history needs checking when codified. Geometry is jurisdiction only.
- Reuse terms: official legal text, no GIS licence assumption; no import proposed.
- Spot check: statutory maximum is contextual to every sampled street, but no location-specific E7 permission was found for the ten+ places in table A. Statutory driveway/crosswalk/intersection/vehicle restrictions can apply without a recorded sign; absence of signs does not satisfy E7's signs-only-exceptions condition.
- May establish: legal maximum/context, never Verified Free. The weaker “allowed unless signed” label is **not justified here** by the 72-hour limit alone.
- Unknown cases: all unsigned streets without qualifying E1/E3; vehicle dimensions, driveways, hydrants, crosswalks and other code exceptions.
- Verdict: **rejected for E7 permission default**: fails policy's signs-only-exceptions boundary and location/schedule completeness (criteria 3/4); no ten-place permission check can repair that premise.

### Transaction, occupancy and violation signals

- Publisher / channel: SDOT / Seattle Police Department / Seattle Municipal Court, [Seattle portal catalog](https://api.us.socrata.com/api/catalog/v1?search_context=data.seattle.gov&q=parking&limit=100).
- [Paid Parking Transaction Data](https://data.seattle.gov/dataset/Paid-Parking-Transaction-Data/gg89-k5p6): [JSON endpoint](https://data.seattle.gov/resource/gg89-k5p6.json), 157,282 rows by `count(*)` on 2026-10-09; `rowsUpdatedAt` 2026-10-09T14:05:06Z. `transaction_id/meter_code/transactiondatetime/payment_mean/amount_paid/durationinminutes` are transactions, `elementkey/blockface_name/sideofstreet/parkingspacenumber` placement; coordinates calculated from pay station, not observed driver positions. Portal licence `PUBLIC_DOMAIN`, daily refresh. Transactions show purchases, not current posted rates, parking legality or vacancy.
- [Paid Parking (Last 48 Hours)](https://data.seattle.gov/dataset/hiyf-7edq): [JSON endpoint](https://data.seattle.gov/resource/hiyf-7edq.json), 7,777,265 rows by `count(*)` on 2026-10-09; `rowsUpdatedAt` 2026-10-09T13:53:54Z, portal licence `PUBLIC_DOMAIN`. Fields: `occupancydatetime`, `paidoccupancy`, `blockfacename`, `sideofstreet`, `sourceelementkey`, `parkingtimelimitcategory`, `parkingspacecount`, `paidparkingarea`, `paidparkingsubarea`, `paidparkingrate`, `parkingcategory`, `location`.
- [2026 Paid Parking Occupancy](https://data.seattle.gov/dataset/q2e4-e7e5): [JSON endpoint](https://data.seattle.gov/resource/q2e4-e7e5.json), 73,770,121 rows by `count(*)` on 2026-10-09; `rowsUpdatedAt` 2026-04-07T16:57:12Z, portal licence `PUBLIC_DOMAIN`. Fields: `occupancydatetime`, `paidoccupancy`, `blockfacename`, `sideofstreet`, `sourceelementkey`, `parkingtimelimitcategory`, `parkingspacecount`, `paidparkingarea`, `paidparkingsubarea`, `paidparkingrate`, `parkingcategory`, `location`.
- [Annual Parking Study Data](https://data.seattle.gov/dataset/7jzm-ucez): [JSON endpoint](https://data.seattle.gov/resource/7jzm-ucez.json), 167,799 rows by `count(*)` on 2026-10-09; `rowsUpdatedAt` 2019-11-26T22:30:42Z, portal licence `PUBLIC_DOMAIN`. Fields: `elmntkey`, `study_area`, `sub_area`, `date_time`, `side`, `unitdesc`, `peak_hour_sdot`, `parking_spaces`, `total_vehicle_count`, `dp_count`, `rpz_count`, `tg_car2go`, `bmw_dn`, `lime`, `idling`, `field_notes`, `construction`, `event_closure`, `subarea_label`, `study_year`, `peak_hour_yes_or_no`, `rpz_blocks`, `csm`, `time_stamp`. These are estimates/counts of paid use or historical observations, not a complete current rule inventory. Payment-rate/time-limit category fields describe the statistical observation, not guaranteed present regulation. Location is blockface context, not observed driver vacancy. No individual event records retrieved; no ten-place rule check, rejected at policy type boundary.
- [72hr Parking Ordinance Violations](https://data.seattle.gov/dataset/72hr-Parking-Ordinance-Violations/74ix-6xdj): [JSON endpoint](https://data.seattle.gov/resource/74ix-6xdj.json), 516,949 rows by `count(*)` on 2026-10-09; `rowsUpdatedAt` 2026-10-09T15:56:29Z, daily refresh, portal licence `PUBLIC_DOMAIN`. `servicerequestnumber/createddate/servicerequeststatusname/methodreceivedname/location` are service requests/status, not adjudicated citations. Approximate request coordinates do not establish block-side permission. Personal/vehicle fields excluded from retrieval and this inventory.
- [Seattle Vehicle Infractions](https://data.seattle.gov/dataset/Seattle-Vehicle-Infractions/jxcr-rhfz): catalog describes types by year; zero tabular columns in the current metadata, `rowsUpdatedAt` 2019-06-12T21:13:46Z; declared quarterly, `PUBLIC_DOMAIN`. No current queryable geocoded citation count or location precision established. The court's interactive citation lookup is not bulk rule evidence and was not queried for personal records.
- Spot check: no ten-place signal check; no signal can pass as rule evidence. They may support advisory warnings/Unknown after separately validating relevance/freshness, never any rule or Coverage.
- Verdict: **rejected as Parking Rule evidence** for all signals under #2; no signal approval or adapter proposed here. Retrieval time and a daily label do not cure old statistics or establish enforcement on a sampled curb.

### H. Supplemental source records checked against fuller sign text

Unlike table E’s presence probes, these samples start with ten actual records from each named source, join their block side to Blockface and compare all returned Parking Features layer 4 sign text. These are separate official layers, not field observations. No sign-return result or category agreement establishes permission; extent, currency and source approval remain unresolved. Query the source by the printed `ELMNTKEY`, then compare sign `UNITID` and `TEXT`.

#### Curb Space Categories / Paid Area Curb Spaces

Both source endpoints returned the same ten sampled space records; they are replicated views, not independent corroboration.

| ELMNTKEY / record key | Location / side | Source value | Sign comparison |
|---|---|---|---|
| 1214 / 79436 | 1ST AVE S BETWEEN YESLER WAY AND S WASHINGTON ST, E | PS | Paid signs confirm 2-hour maximum; separate Sunday 10–18 no-payment 2-hour rule exists |
| 68929 / 18367 | 1ST AVE N BETWEEN MERCER ST AND ROY ST, W | PS | Payment/event and disabled-permit signs coexist; precise space allocation required |
| 1006 / 4747 | 1ST AVE BETWEEN COLUMBIA ST AND MARION ST, NE | XW | Crosswalk type cannot confer permission; loading/payment/no-stopping signs coexist |
| 27274 / 54937 | 3RD AVE BETWEEN PINE ST AND STEWART ST, NE | TAZ | No-stopping and bus signs support restricted use |
| 71289 / 23152 | 22ND AVE NW BETWEEN NW 56TH ST AND NW 57TH ST, W | PS | Paid 4-hour signs coexist with loading and 30-foot exclusion |
| 72321 / 28519 | 3RD AVE BETWEEN COLUMBIA ST AND MARION ST, SW | XW | Bus/no-stopping signs present; crosswalk is not parking |
| 2785 / 14025 | 2ND AVE BETWEEN CEDAR ST AND CLAY ST, SW | PS-LAY | Paid and permit-only shuttle/Metro windows differ across signs; partition required |
| 27430 / 87732 | 3RD AVE W BETWEEN W REPUBLICAN ST AND W MERCER ST, E | TL-RPZ | Zone 13 daytime 2-hour and evening permit-only text present |
| 46457 / 25979 | 1ST AVE W BETWEEN W HARRISON ST AND W REPUBLICAN ST, W | CLR | Passenger loading/payment/event restrictions coexist; clear space is not permission |
| 27397 / 1471 | 3RD AVE S BETWEEN S WASHINGTON ST AND S MAIN ST, W | CRBBLB | Bus signs present; curb bulb is not parking |

#### Peak Hour Parking Restrictions

| ELMNTKEY / record key | Location / side | Source value | Sign comparison |
|---|---|---|---|
| 31454 / 25238 | AIRPORT WAY S BETWEEN 13TH AVE S AND S HARDY ST, SW | 7-9AM 4-6PM | Only anytime prohibition text found; split hours not independently corroborated |
| 60973 / 25239 | N 50TH ST BETWEEN MERIDIAN AVE N AND KEYSTONE WR PL N, N | 4-6PM | Sign confirms 16–18 except weekends/holidays |
| 82129 / 25240 | E JOHN ST BETWEEN 14TH AVE E AND E JOHN SR ST, N | 7-9AM | Sign confirms 07–09 except weekends/holidays; anytime prohibition also present |
| 64302 / 25241 | NW LEARY WAY BETWEEN LEARY WAY NW AND 11TH AVE NW, S | 7-9AM 4-6PM | Sign confirms both windows except weekends/holidays |
| 8810 / 25242 | AIRPORT WAY S BETWEEN S HOMER ST AND S DORIS ST, SW | 7-9AM 4-6PM | No matching peak text found; time-limited/loading text insufficient |
| 19201 / 25243 | NW 85TH ST BETWEEN 14TH AVE NW AND MARY AVE NW, N | 4-6PM | Sign confirms 16–18 except weekends/holidays |
| 71725 / 25244 | 25TH AVE NE BETWEEN NE 68TH ST AND NE 70TH ST, W | 7-9AM | 07–09 text present; another custom text includes 16–18, extent unresolved |
| 50737 / 25245 | 35TH AVE NE BETWEEN NE 91ST N ST AND NE 92ND S ST, W | 7-9AM | Sign confirms 07–09 except weekends/holidays |
| 80881 / 25246 | STEWART ST BETWEEN 4TH AVE AND 5TH AVE, NW | 6-9AM 3-6PM | Sign confirms both windows except weekends/holidays; loading/payment periods coexist |
| 2254 / 25247 | 15TH AVE W BETWEEN W ARMORY WAY AND W BOSTON ST, E | 3-7PM | 15–19 confirmed; another sign also prohibits 07–09, extent unresolved |

#### Curbspace Transit Layover

| ELMNTKEY / record key | Location / side | Source value | Sign comparison |
|---|---|---|---|
| 86061 / 93235 | NE RAVENNA WB BV BETWEEN NE 65TH ST AND NE 63RD ST, NE | BUSLAY | 24-hour Metro-only text present despite Unrestricted Blockface summary |
| 56686 / 83339 | LENORA ST BETWEEN 5TH AVE AND 6TH AVE, SE | PS-LAY | Metro-only split windows vary between signs; partition required |
| 10153 / 28657 | EASTLAKE AVE E BETWEEN THOMAS ST AND HARRISON ST, W | PS-LAY | Community Transit-only 14–18 Monday–Friday text present |
| 77446 / 93933 | CALIFORNIA AVE SW BETWEEN SW MASSACHUSETTS ST AND SW HOLGATE ST, E | BUSLAY | Only arrow prohibition found; layover schedule uncorroborated |
| 30789 / 94072 | 6TH AVE S BETWEEN S ROYAL BROUGHAM WAY AND S MASSACHUSETTS ST, W | BUSLAY | 24-hour Metro-only and police-only text coexist |
| 80213 / 75254 | PINE ST BETWEEN 9TH AVE AND TERRY AVE, NW | BUSLAY | 24-hour Metro-only text present |
| 13349 / 20558 | WALL ST BETWEEN 3RD AVE AND 4TH AVE, NW | PS-LAY | Metro-only 06–09 and 15–19 Monday–Friday text present |
| 33990 / 12730 | LENORA ST BETWEEN 4TH AVE AND 5TH AVE, SE | PS-LAY | Metro-only split windows plus taxi/loading text; partition required |
| 33005 / 75299 | EASTLAKE AVE E BETWEEN STEWART ST AND THOMAS ST, W | PS-LAY | Transit-only 14–19 Monday–Friday text present |
| 81454 / 21211 | WARREN PL BETWEEN 1ST AVE AND DENNY WAY, E | PS-LAY | Metro-only 15–18 Monday–Friday text present |

#### Parking Categories

| ELMNTKEY / record key | Location / side | Source value | Sign comparison |
|---|---|---|---|
| 21277 / 4253529 | S OREGON ST BETWEEN POWELL PL S AND 11TH AVE S, N | Unrestricted Parking | No signs returned; Unrestricted summary is not permission |
| 88082 / 4253530 | S FOUNTAIN ST BETWEEN 63RD AVE S AND RENTON AVE S, SE | Unrestricted Parking | 30-foot prohibition contradicts whole-side Unrestricted interpretation |
| 55221 / 4253531 | DELRIDGE WAY SW BETWEEN SPOKANE TURN RD AND W SEATTLE BR WB OFF RP, NW | Unrestricted Parking | No signs returned; Unrestricted summary is not permission |
| 64646 / 4253532 | S BYRON ST BETWEEN RAINIER AVE S AND WETMORE AVE S, SE | Restricted Parking Zone | Zone 16 2-hour 07–18 Monday–Friday text corroborates category |
| 57442 / 4253533 | PASADENA PL NE BETWEEN NE 42ND ST AND DEAD END 2, E | Unrestricted Parking | No signs returned; Unrestricted summary is not permission |
| 72229 / 4253534 | 29TH AVE E BETWEEN E THOMAS ST AND E HARRISON ST, W | Restricted Parking Zone | Zone 23 2-hour 07–19 except Sundays/holidays corroborates category |
| 30218 / 4253535 | 5TH AVE S BETWEEN S AUSTIN ST AND S HOLDEN ST, E | Unrestricted Parking | No signs returned; Unrestricted summary is not permission |
| 41918 / 4253536 | S AVON ST BETWEEN 51ST AVE S AND BEACON E AVE S, S | Unrestricted Parking | 30-foot prohibition contradicts whole-side Unrestricted interpretation |
| 8745 / 4253537 | 9TH AVE W BETWEEN W GARFIELD ST AND W BLAINE ST, W | Unrestricted Parking | No signs returned; Unrestricted summary is not permission |
| 41922 / 4253538 | S BAILEY ST BETWEEN FLORA AVE S AND ELLIS AVE S, S | No Parking Allowed | Anytime no-parking text corroborates category |

Symbology/reserve wildcard and broad-field queries returned ArcGIS 400 invalid-parameter errors. A reduced `outFields=ELMNTKEY,SPACETYPE,CATEGORY` query succeeded for both; table J records ten actual locations from each view and compares fuller official sign text. This workaround supports limited sampled-field checks, not validation of the unavailable fields or an import-ready verdict.

### I. City lot directory ↔ current Diamond operator listings (10 address matches)

Compared ten city directory records with the operator’s [official location page](https://www.diamondparking.com/find-parking/) and its publicly linked [location data](https://www.diamondparking.com/wp-content/plugins/diamond-parking/assets/data.json), retrieved 2026-10-09. The feed contains 1,614 operator locations across cities; these ten matches are Seattle addresses, not ten approved free-parking rules. Operator records expose location IDs, addresses, coordinates, payment information and some monthly prices; no complete hourly schedule, per-rule edit date or reusable feed licence established. Public monthly prices do not establish short-term rates or free periods; blank prices do not mean free. This is rejected as an import-ready E6 feed pending those missing criteria.

| City BUSLIC_ID | Operator code / ID | Matched address | Operator monthly listing |
|---|---|---|---|
| 535675 | WU13 / 15397 | 4100 University Way NE | 50.00 Evenings and Weekends only |
| 588668 | WU46 / 16121 | 4244 11th Ave NE | 300.00 |
| 684294 | A617 / 15857 | 2003 WEST DRAVUS STREET | 60.00 |
| 535686 | WU18 / 15600 | 936 N. 34th St. | Not supplied; no free inference |
| 718894 | A672 / 15218 | 1135 NORTHWEST LEARY WAY | 50.00 |
| 707480 | WX18 / 16033 | 3627 Stone Way N | Not supplied; no free inference |
| 604022 | A1047 / 36624 | 910 8th Ave | Not supplied; no free inference |
| 669059 | A370 / 15634 | 660 ELLIOTT AVENUE WEST | 65 |
| 5483 | A1107 / 35884 | 100 W Roy St | Not supplied; no free inference |
| 575058 | A1154 / 36335 | 400 Roy Street | $175.00 and $ 125.00 . |

The city’s sampled hours/rate/operator-URL fields are null even where the operator lists a paid product. The directory cannot supply permission by itself. These are ten additional directory/operator comparisons, including three table-F facilities (WU13, WU46 and A617); the other seven table-F samples still lack recorded operator matches. Full short-term rules remain unverified.

### J. Symbology/reserve remote record checks

Queried each view for 200 records with `outFields=ELMNTKEY,SPACETYPE,CATEGORY`, selected the first ten distinct non-null block keys, and joined Blockface and all returned Parking Features layer 4 signs. The same asset exports limit independence. The symbology sample exactly matches the ten curb-category locations/results in H: 1214, 68929, 1006, 27274, 71289, 72321, 2785, 27430, 46457 and 27397. Its returned space types also agree. This is a replicated view, not ten new confirmations of rule correctness.

The reserve sample includes five overlapping locations and five additional sides:

| ELMNTKEY | Place / side | Reserve type | Expanded sign comparison |
|---|---|---|---|
| 1214 | 1ST AVE S BETWEEN YESLER WAY AND S WASHINGTON ST, E | PS | Same as H: payment and separate Sunday time-limit signs coexist; exact extent unresolved |
| 68929 | 1ST AVE N BETWEEN MERCER ST AND ROY ST, W | PS | Same as H: event pricing and disabled-permit conditions coexist; exact extent unresolved |
| 71289 | 22ND AVE NW BETWEEN NW 56TH ST AND NW 57TH ST, W | PS | Same as H: paid four-hour and loading/exclusion signs coexist; exact extent unresolved |
| 2785 | 2ND AVE BETWEEN CEDAR ST AND CLAY ST, SW | PS-LAY | Same as H: payment and bus/permit-only windows require partition; exact extent unresolved |
| 27430 | 3RD AVE W BETWEEN W REPUBLICAN ST AND W MERCER ST, E | TL-RPZ | Same as H: zone 13 daytime allowance and evening permit-only text; exact extent unresolved |
| 1234 | 10TH AVE BETWEEN E PIKE ST AND E PINE ST, E | PS | SGN-169684: pay 08–22 except Sundays/holidays, two hours with no time limit after 17; back-in-angle signs also present; exact extent unresolved |
| 25714 | 2ND AVE BETWEEN BELL ST AND BATTERY ST, NE | PS | SGN-205399: pay 08–20 except Sundays/holidays, four hours; commercial/passenger loading also present; exact extent unresolved |
| 24046 | 1ST AVE BETWEEN WALL ST AND VINE ST, NE | PS | SGN-69477: pay 08–20 except Sundays/holidays, four hours; loading/no-stopping also present; exact extent unresolved |
| 3081 | 20TH AVE NW BETWEEN NW MARKET ST AND NW 56TH ST, W | PS | SGN-69287: pay 08–20 Monday–Saturday, four hours; anytime no-parking also present; exact extent unresolved |
| 70866 | 2ND AVE S BETWEEN S JACKSON ST AND S KING ST, E | PS | SGN-11009: pay 08–18 except Sundays/holidays, two hours; loading/angle-parking/variable prohibition also present; exact extent unresolved |

Reserve includes payment, transit-sharing and RPZ uses; the word “Reserve” is not a permission type. Neither view has a complete schedule in the successful projection. Both remain rejected standalone sources; fields not successfully retrieved require adapter format investigation if used as supplements.

### K. Pay-station rates ↔ SDOT published rates (10 stations)

On 2026-10-09, matched station `PAIDAREA/SUBAREA` to the [current SDOT rate table](https://www.seattle.gov/transportation/projects-and-programs/programs/parking-program/paid-parking-information/street-parking-rates). All published numeric morning/afternoon/evening rates match. Three stations have null evening bands where the web table omits an evening price; omission is not proof of free permission. This checks rates against an official web publication, not merely Blockface’s replicated fields. It does not check exact time boundaries, weekend/holiday rates or competing prohibitions.

| Station / ELMNTKEY | Published area | Morning / afternoon / evening ($ per hour) | Result |
|---|---|---|---|
| 529836 / 39293 | University District - Core | $1.00 / $5.50 / $3.00 | Numeric rates agree; curb permission unresolved |
| 528138 / 68917 | Belltown - North | $1.00 / $1.50 / $1.50 | Numeric rates agree; curb permission unresolved |
| 510292 / 53805 | Denny Triangle - North | $2.50 / $7.50 / $2.50 | Numeric rates agree; curb permission unresolved |
| 504906 / 33741 | Uptown Triangle | $1.00 / $1.50 / not published | Numeric rates agree; curb permission unresolved |
| 339352 / 31313 | South Lake Union - South | $1.00 / $5.00 / not published | Numeric rates agree; curb permission unresolved |
| 591312 / 30698 | Commercial Core - Retail | $2.50 / $6.00 / $1.50 | Numeric rates agree; curb permission unresolved |
| 668598 / 1821 | Pike-Pine | $1.00 / $5.00 / $8.00 | Numeric rates agree; curb permission unresolved |
| 828938 / 6357 | Uptown | $1.00 / $1.50 / $1.50 | Numeric rates agree; curb permission unresolved |
| 282389 / 31893 | Belltown - North | $1.00 / $1.50 / $1.50 | Numeric rates agree; curb permission unresolved |
| 336536 / 33146 | South Lake Union - South | $1.00 / $5.00 / not published | Numeric rates agree; curb permission unresolved |

### L. Public temporary-permit confirmation and remote limits

The [Seattle Services Portal record SDOT-TNP-00-15066](https://services.seattle.gov/Portal/Cap/CapDetail.aspx?Module=SDOTTraffic&TabName=SDOTTraffic&capID1=22CAP&capID2=00000&capID3=00H5O&agencyCode=SEATTLE&IsToShowInspection=), read in the public browser on 2026-10-09, shows an issued paid-area temporary-no-parking licence, expiry 03/18/2027 and permit address 747 Broadway. It confirms issuance only: that address does not establish the sampled Minor/Marion curb allocation, and an expiry date does not independently establish the GIS start/end instants. No date conversion or active-at-selected-time conclusion is made. Direct HTTP returned 403; the browser exposed these public fields, but not the full applicable curb/daily schedule. No applicant information retrieved or retained in this inventory.

[Official permit guidance](https://seattlegov.zendesk.com/hc/en-us/articles/360039695714-How-Do-I-Apply-for-a-Temporary-No-Parking-Paid-Area-Permit) separately requires the public notice attached to temporary signs. Permit status is not confirmation that signs were posted. Ten complete independent temporary-schedule/posting checks remain unavailable remotely; criterion 7 is pending, not waived. The E5 adapter must not infer unrestricted/free from an absent reservation, unknown allocation or incomplete time fields. This inventory does not change #2’s runtime stale-source caveat.

## Remote-only inventory completion boundary

The user authorized a remote-only completion route on 2026-10-09; on-site checks are unavailable. #20’s inventory acceptance now distinguishes candidate assessment from source approval: record all requested metadata and all available remote comparisons; for unavailable checks, state the failed/pending criterion, exact missing evidence and resulting Unknown/exclusion. Rejected context, signals and duplicate views do not need ten successful permission checks to be catalogued as rejected. No source is approved by this adjustment.

- Core candidates: Blockface/signs and RPZ have 17/10 sampled sides/zones, with conflicts and extent gaps recorded; payment has ten published-rate comparisons; TNP has ten location joins and one public issuance check, but independent schedules/posting remain pending.
- Supplemental candidates: ten actual records per curb/paid, peak, category, layover, symbology and reserve family are recorded (replicated views explicitly identified). Tiers have ten paid-location probes; full schedule applicability is pending.
- E6: ten city/operator address/product matches plus operator-page checks are recorded; no complete reusable lot-rule feed approved. Current Northgate C terms supersede the earlier abbreviated free-window description.
- Context/signals/E7: rejected at their stated policy boundaries, with search and metadata evidence; no fabricated permission checks.
- Remaining approval work belongs to #24–#27: reuse applicability, sign-field/curb extent reconciliation, RPZ 14/22 conflicts and zone 25 field disagreement, event/holiday conditions, incomplete unpaid E5 geometry, and independent temporary schedule evidence. Source acceptance criterion 7 still requires ten independent locations with zero safety contradictions before approval.

Inventory preparation can be complete while Coverage is none. The maintainer accepted inventory completion and authorized closing #20 on 2026-10-09, with remaining evidence gaps carried into #24–#27 as implementation progresses. Draft PR #36 remains unmerged; closure does not establish integration. #25’s remaining prerequisite is #11; adapter preparation is separate from approval to load/serve real source rules. No #2 policy or #24 production-approval gate changed.

## Unknown areas and gaps

- **Entire Seattle remains outside approved Coverage.** Draft verdict none follows the policy's approved-only rule, not a finding that all parking is prohibited. No sources approved or synced by this inventory.
- Non-CSM residential blockface geometry, mixed-use block sides and unsigned curbs: no free recommendation from category, zero meters or absent signs. Exact curb-space partition and statutory exclusions need reconciliation.
- RPZ polygons alone, layer 0's zero rows, zone 14 polygon/sign disagreement, zones 25/22 structured/text discrepancies, zone 21 alternatives, zone 13 evening permit-only periods and A/B Husky dates: keep Unknown until precise signed rules are validated. Record-level zone IDs may change after nightly exports; zone number/subarea is semantic identity.
- Temporary unpaid restrictions cover places absent from the paid-curb feed. Address points/custom schedules are not sufficient E5 extents. No “full Coverage” target is defensible until those are resolved or a precise excluded subset is approved. Active reservations need independent sign/schedule confirmation, actual/planned-time semantics and daily sync.
- Pay-station schedules alone cannot permit free after hours; holidays, large-event charging, load zones and vehicle conditions must be checked. Table A already shows paid summaries with uncorroborated payment signs and mixed restrictions.
- No complete E3 inventory claim or qualifying E7 default; no import-ready public lot evidence. Citywide boundaries and facility-directory entries confer no Coverage.
- Reuse applicability and the GIS proxy crawl remain incomplete. Current `lastEditDate` can be an export refresh; symbology/reserve `dataLastEditDate` is older than 24 months. No routine timestamp should hide an old rule.
- Required SDOT clarification package (not sent): official sign code/day/time/arrow dictionary, payment minute-boundary conventions, RPZ discrepancies/visitor allowances, empty signed-block layer, unpaid restriction geometry/daily hours, and scheduled-versus-actual TNP semantics. This historical request plan is superseded by ADR-0004: resolve gaps only from existing published evidence; existing #24 owns approval, #25–#27 own implementation. No new public-records or data-request ticket/contact was filed in this scoped inventory run.
- Possible future partial subset: precisely delimited managed curb portions with validated Blockface + signs + payment + applicable RPZ + both temporary restriction channels. This is a research target, **not** an approved or implemented Coverage verdict. Full requires citywide accepted E1 (or complete E3 + qualifying E7), permit/payment coverage and E5 daily sync.

## Tickets

- [#20 inventory](https://github.com/BinaryDevil/find-free-parking/issues/20): completed inventory assessment accepted by the maintainer; draft PR #36 remains pending integration, and source approval is separate.
- [#24 human approval/reuse](https://github.com/BinaryDevil/find-free-parking/issues/24): approve only after the above missing terms/checks/discrepancies are resolved; not waived by this document.
- [#25 Blockface end to end](https://github.com/BinaryDevil/find-free-parking/issues/25): main E1 adapter and supporting curb allocation/sign/payment evidence; tables A/C provide public fixture keys. Source format joins and unparsed signs must remain fail-safe.
- [#26 RPZ](https://github.com/BinaryDevil/find-free-parking/issues/26): table B contradictions and visitor/subarea cases; no blanket zone visitor limit.
- [#27 temporary overrides](https://github.com/BinaryDevil/find-free-parking/issues/27): table D location fixtures; address-point unpaid gap and custom/actual schedule semantics remain unresolved.
- [#2 policy/spec](https://github.com/BinaryDevil/find-free-parking/issues/2), [#23 policy ADR](https://github.com/BinaryDevil/find-free-parking/issues/23), [#33 go-live](https://github.com/BinaryDevil/find-free-parking/issues/33): inventory does not waive schema/evaluator, human approval, release or live-verification gates.

Existing source/approval tickets are linked rather than duplicated as instructed by #20. Supporting views and rejected standalone feeds are not granted their own adapter approval. No policy amendment is needed to classify these gaps: the existing criteria already require Unknown for ambiguous location/schedule and reject signal-based permission.
