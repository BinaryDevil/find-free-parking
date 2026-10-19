# Vancouver, British Columbia: source inventory

Status: inventory complete; source approval pending
Timezone: America/Vancouver
Coverage verdict: none (no approved source; Vancouver remains not covered)
Draft partial target: **validated, in-service City meter locations and their precisely assigned metered curb portions, plus independently confirmed signed Resident Parking Only / Resident Permit Parking curb restrictions within RPO, RPP and VRPP polygons**. This excludes whole unmetered blocks, polygon interiors without confirmed curb rules, lots, and specialized spaces without matching vehicle context. See the approval conditions below.
Policy: [ADR-0002 Evidence Source Policy](../adr/0002-evidence-source-policy.md), [ADR-0004 no outreach](../adr/0004-no-external-outreach.md), and [ADR-0005 agent verification](../adr/0005-agent-verified-gates.md)
Observed: 2026-10-09. Counts are live public-source counts, not imported rows. ArcGIS edit times are UTC export/service edits; they do not prove every rule was inspected that day.

This read-only inventory implements the research scope of [#21](https://github.com/BinaryDevil/find-free-parking/issues/21). All sources remain unapproved. It does not seed data, change the registry, establish implemented Coverage, or authorize production loading. No city contact, permission request or external message has been sent. Source approval remains a separate independent two-agent review under ADR-0005 in [#24](https://github.com/BinaryDevil/find-free-parking/issues/24).

## Evidence types

| Type | Source(s) | Search result / limit |
|---|---|---|
| E1 Block-level regulations | None found with complete per-curb permission, days, times and limits | City portal parking/regulation/curb/sign searches, both City GIS directories, ArcGIS/Socrata and national search below. Meter data is E2; a road class is context. |
| E2 Meter / payment feed | Parking meters portal; paMeter hosted GIS; GDH/paMeter server | Found, differing snapshots. Current fields include rush hours and prohibitions; location allocation and undocumented day/override semantics remain pending. |
| E3 Sign inventory | None found as a complete machine-readable parking-sign inventory | Portal and both GIS directories; specialized parking points are not every applicable sign. Detailed permit PDF maps are guides, not a complete sign feed. |
| E4 Zone polygons | ResidentialParkingPermitZones (RPO, RPP, VRPP) | Found outside portal catalogue, also visible in broad ArcGIS search under “City of Vancouver”. Licence lead recorded; permission still pending. |
| E5 Temporary restrictions | Road Ahead portal extracts, current hosted Road_Ahead_View, historical film polygons | Found. Current hosted view has richer schedules; portal extracts are older and lack starts/daily hours. No complete precise curb restriction feed approved. |
| E6 Lots / operators | EasyPark lot directory / lot pages; TransLink Park and Ride | Found web candidates; no import-ready Vancouver lot-rule feed with complete geometry/schedule/reuse established. Regional transit lots do not create Vancouver street Coverage. |
| E7 Bylaw default rule | Street and Traffic By-law 2849, Parking Meter By-law 2952; City unsigned-street guidance | Found constraints, **no qualifying signs-only-exceptions permission default**. Unsigned statutory exclusions exist. |
| Signals (citations etc.) | Parking tickets and historical archives; OSM, street class, missing meters | Ticket aggregates found. These can challenge confidence, never establish permission or Coverage. |

### Search log (policy order)

1. [City open-data catalogue](https://opendata.vancouver.ca/explore/) via `/api/explore/v2.1/catalog/datasets`: searched parking, curb, regulations, signs and Road Ahead. Reviewed meters, motorcycle/accessibility, three Road Ahead datasets, current/historical tickets and Olympic restrictions. No complete E1/E3 found in these searches. `road-ahead` is not a dataset ID (404); use the three exact IDs below.
2. Crawled [City hosted ArcGIS directory](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services?f=pjson) and [City server directory](https://maps.vancouver.ca/server/rest/services?f=pjson) with the repo’s read-only discovery script. Hosted directory contains unlisted permit polygons, current meters and Road Ahead; City server crawl listed 191 services and exposed older meter representations. The helper filters names, caps 2,000 services/eight layers, and skips unreachable services; this is documented discovery, **not proof of exhaustive absence**. Development/UAT and land-use/traffic-signal services are not parking regulation evidence.
3. Ran `discover_city_sources.ts Vancouver "City of Vancouver"`: ArcGIS sources below; Socrata returned none. Vancouver, Washington hits (`CityOfVancouverGISAdmin`, `gis.cityofvancouver.us`) are outside this jurisdiction and rejected. UBC’s 2022 meter copy is not the regulating body. Broad ArcGIS search is capped at 50 results; permit source is not guaranteed to appear under every search term.
4. [Canada open-data catalogue](https://open.canada.ca/data/en/dataset?keywords=parking+Vancouver) and national web search for Vancouver parking regulations/meters: no additional authoritative curb-rule dataset found. Direct catalogue reader failed; this is an access limit, not an exhaustive negative search. Provincial traffic rules cannot replace precise City curb evidence.
5. [TransLink Park and Ride](https://www.translink.ca/rider-guide/driving/park-and-ride), [guidelines](https://www.translink.ca/-/media/translink/documents/rider-guide/driving/translink-park-and-ride-guidelines_2021.pdf), and [EasyPark locations](https://www.easypark.ca/find-parking/locations-and-lot-information): regional facilities and official operator candidates found, no complete accepted E6 feed. No assumption that a Metro Vancouver facility lies in the City of Vancouver.
6. [Unsigned streets](https://vancouver.ca/streets-transportation/unsigned-streets-and-lanes.aspx), [signed/time-limited meters](https://vancouver.ca/streets-transportation/time-limited-metered-parking.aspx), [Street and Traffic By-law](https://bylaws.vancouver.ca/2849c.pdf), [Parking Meter By-law](https://bylaws.vancouver.ca/2952c.pdf): no E7 default eligible to produce Verified Free.
7. Portal ticket dataset metadata and anonymous 2024–25 block aggregates checked. Current `parking-tickets` now covers 2026 onward; use `parking-tickets-2020-2025` for historical regression signals. No personal ticket lookup.
8. No request sent. Missing E1/E3 prevent full Coverage, which is outside this ticket’s partial target. Questions about curb allocation, rush-day/override semantics and zone rights are carried into existing #28/#29/#24; the new E5 follow-up is #37. Missing E1/E3 evidence remains a Coverage limit; ADR-0004 prohibits preparing or sending data requests.

## Reuse terms and reproducible method

2026-10-13 follow-up: see the [#24 terms evidence and approval matrix](approval-seattle-vancouver.md). It records exact published scope leads and unresolved permissions; the historical observations below remain dated snapshots, not a new source verification.

Portal datasets explicitly identify [Open Government Licence – Vancouver v1.0](https://opendata.vancouver.ca/pages/licence/). The page’s embedded content was read through a standard HTTP reader because the web reader showed only its shell. It permits commercial reuse/adaptation subject to attribution, excludes personal information/third-party rights/official marks, and grants no City endorsement. Suggested attribution: City of Vancouver; link the licence and identify transformations. The portal licence **does not automatically apply to unlisted GIS services**.

The hosted permit item [8295da8234aa459e88f152f762548585](https://www.arcgis.com/home/item.html?id=8295da8234aa459e88f152f762548585), owned by `City_of_Vancouver`, records `licenseInfo="CC BY"` on this date. This is a published licence lead, not “no licence found”. It lacks a version/link and clear applicability details; the `cover-city` rule for an unlisted service and #24 require a recorded, confirmed permission basis before approval. **Permit reuse remains pending and the source is excluded from use until published terms covering the exact item are confirmed**. ADR-0004 prohibits permission requests; missing terms cannot be replaced by outreach or owner judgement. The meter/motorcycle/accessibility/carshare items also say CC BY without a version; Road Ahead’s item has no `licenseInfo`.

Portal metadata: `GET https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/<id>`; records: `/records?where=<predicate>&select=<public-fields>&limit=100&offset=<offset>`; public meter snapshot: `/parking-meters/exports/json`. ArcGIS: layer `?f=pjson`, count `/query?where=1%3D1&returnCountOnly=true&f=json`, page records with `resultOffset/resultRecordCount`, stable sort, check `exceededTransferLimit`, request `outSR=4326`. EPSG:26910 is native metres for current hosted layers. `OBJECTID` is an export identifier; prefer semantic IDs plus geometry where IDs repeat. Never retain Road Ahead `citycontacts/applicantcontacts` in fixtures or routine logs.

## Sources

### City parking meters (E2)

- Publisher / channel: City Engineering Services; [portal](https://opendata.vancouver.ca/explore/dataset/parking-meters/), [current hosted layer](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/paMeter/FeatureServer/0), [item](https://www.arcgis.com/home/item.html?id=26ebe8ae6af1418e82a303b66f1a1c60).
- Geometry and precision: current point records with meter/post/zone keys; portal description still says block-level and warns meters do not occupy the whole block face. Pay-station points do not delineate every served space. Resolve this metadata/geometry discrepancy and exact curb allocations before free recommendations.
- Records: portal **3,642**, modified **2026-10-05T19:09:32Z**, weekly extract; hosted **3,633**, edited **2026-10-09T09:34:09.534Z**. Portal: 3,264 In Service, 359 Out of Service, 19 Removed; 861 have AM or PM rush windows; 271 have a prohibition-zone field. These are source rows, not usable-space counts.
- Fields used: `meter_id` string identity (preserve leading zeros and letters), `feature_id/post_feature_id/parking_zone_feature_id` source joins; `service_status`, `meter_head`, `direction`, `vehicle_type`, geometry. `rate_9am_6pm/rate_6pm_10pm` currency-text daytime/evening rates; `flat_rate` optional text requiring its own semantics. `time_limit_9am_6pm/time_limit_6pm_10pm` weekday bands; `time_limit_weekend_9am_6pm/time_limit_weekend_6pm_10pm` weekend limits; text values include `2 Hr`, `4 Hr`, `No Time Limit`; null is not unlimited. `time_limit_override/prohibition_override` Yes/No flags need documented precedence.
- Restriction fields: `am_rush_hours/pm_rush_hours` time ranges without day fields; observed 07:00–09:30, 07:00–10:00, 15:00–18:00, 15:00–19:00. Do not guess weekdays/holidays. Both `prohibition_1_days/time/zone` and `prohibition_2_days/time/zone` must be read. Days include Mon–Fri, Mon–Sat, Sat–Sun, individual weekdays and seven days; time text includes Noon, Midnight, Anytime and overnight ranges. Zones include CVLZ, LOADING ZONE, PASSENGER ZONE, NO STOPPING, TAXI ZONE, PERMIT PARKING ONLY, TOUR BUS, POLICE, MILITARY and AUTHORIZED VEHICLES ONLY. Their permissions/exemptions need documented rules and vehicle context.
- Hosted mapping: `METER_ID`, `FID_METER/FID_POST/FID_ZONE`, `RATE_9A_6P/RATE_6P_10P`, `TIME_LIMIT_9A_6P/TIME_LIMIT_6P_10P`, `TIME_LIMIT_WEEKEND_9A_6P/TIME_LIMIT_WEEKEND_6P_10P`, uppercase rush/prohibition/override/status/vehicle names. This is **not** the old `r_mf_9a_6p`, `t_mf_9a_6p`, `timeineffe`, `meterid` schema; adapter #28 must validate its chosen format and fail loudly on drift.
- Reuse terms: explicit portal licence above; hosted CC BY lead needs confirmation if used as production input rather than corroboration.
- Spot check: table A, 12 distinct meter locations compared by ID to the second official hosted layer, covering rush-hour, loading/no-stopping, overnight, time limits, vehicle restrictions, overrides, removed and after-hours candidates. Replicated City source limits independence; official meter web guidance corroborates general 09:00–22:00 daily/holiday payment, competing restriction precedence and broken-meter exclusion, not individual numeric rates. One safety-relevant time-limit conflict found; zero-contradiction criterion not passed.
- May establish: E2 paid hours/rates; after-hours Verified Free only at confirmed meter curb portions with complete parsed prohibitions and limits and no competing restriction. No nearby unmetered permission.
- Unknown cases: undocumented rush days/holiday treatment, override flags, missing schedules/limits, specialized vehicle context, unclear pay-station extent, conflicting/missing IDs, flat-rate conditions, temporary changes, null fields and stale sync. Out of Service/broken meters are not free; Removed/missing meters must not be served as current recommendations, while stored history is preserved.
- Verdict: **pending criteria 3/4/7**, and criterion 6 for alternate hosted production reuse. Portal terms recorded; no source approval. Link #28.

### Resident Parking Fees and Zones (E4)

- Publisher / channel: City official hosted GIS; [ResidentialParkingPermitZones/0](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/ResidentialParkingPermitZones/FeatureServer/0); linked City permit-program URL in records; item and licence lead above.
- Geometry and precision: EPSG:26910 polygons, request 4326 for point queries. Multiple parts/records share `MAPID`; 534 records are not 534 distinct permit programs. Polygons include permit eligibility areas and do not assign every curb’s sign or schedule.
- Records: **534**, last edited **2026-10-09T08:57:14.914Z**.
- Fields used: `MAPID` zone identity, `TYPE` RPO/RPP/VRPP, `DESCRIPTION/NAME` program/name, `URL` official guidance; `EXPIRY_DATE/HOUSEHOLD_LIMIT/ANNUAL_PERMIT_FEE` permit administration, **not parking hours, visitor duration or hourly payment**. No day/time/visitor allowance fields. Sample: `OBJECTID=267, MAPID=RPP025, TYPE=RPP, NAME=West End Plateau`.
- Reuse terms: **pending**; unlisted service’s CC BY lead recorded without version/scope confirmation, no confirmed published terms covering the exact item; excluded from use pending #24 review.
- Spot check: table B, ten official intersection points plus 1000 Bidwell representative point and official 1100 Bidwell/1100 Jervis addresses. Independent property/intersection layers confirm location, City permit web page corroborates zone names and mixed signed regulations, historical ticket aggregates signal signed restrictions at sampled blocks. These checks do not confirm each curb’s current posted hours. Exact 1000 Bidwell rooftop point was absent from property addresses; interpolation is explicitly distinguished below. West End PDF map fetch returned 403 and could not be visually inspected; no PDF sign validation claimed.
- May establish: E4 restricted/paid zone context where actual signed curb application and hours are confirmed; never free outside polygons. The [City conversion page](https://vancouver.ca/streets-transportation/changing-citywide-resident-parking-only-to-residential-permit-parking.aspx) describes full-time permit and two-hour-except-permit combinations. Do not invent a blanket visitor allowance or classify every meter inside an eligibility polygon permit-only.
- Unknown cases: polygon boundary/curb side, administrative eligibility versus actual signs, RPO conversions, visitor schedules, special exemptions, overlapping meters and unsigned parts. [Accessible-parking guidance](https://vancouver.ca/streets-transportation/accessible-parking.aspx) has different permit/zone exemptions; ordinary passenger-car fixtures cannot stand in for all contexts.
- Verdict: **pending criteria 4/6/7**; polygon precision meets E4's minimum, but signed applicability/schedules and reuse confirmation need reconciliation. #29 regressions should use precise signed curb fixtures for RPP025 rather than convert an eligibility polygon into universal permission/prohibition.

### Road Ahead current hosted view (E5)

- Publisher / channel: City official [roadwork page](https://vancouver.ca/streets-transportation/roadwork.aspx) links [Road Ahead map](https://roadahead.vancouver.ca/); [Road_Ahead_View/0](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/Road_Ahead_View/FeatureServer/0); [item](https://www.arcgis.com/home/item.html?id=2e046092989d4a849c9afa44b6b5ecdc), owner `City_of_Vancouver`.
- Geometry and precision: polygons EPSG:26910; project/traffic-impact envelopes may cover many streets rather than an exact curb. Location text sometimes gives side/range but also broad areas.
- Records: **757**, edited **2026-10-09T20:28:02.289Z**; per-record `updateddate/publisheddate` available. Current records can include old/future schedules; service edit date is not activity.
- Fields used: `planitid` event identity, `objectid` export identity, `eventstatus/projectstatus/eventtype`, `trafficimpact/closuretype`, `title/locationdescription/publisheddescription/publishedurl`, `schedulestartdate/scheduleenddate`, `scheduledescription/scheduleserialized`, `updateddate/publisheddate`; derived `today/tomorrow/weekend/nextsevendays` flags are not selected-time rules. Parse serialized intervals/recurrence rather than a continuous start/end envelope; preserve UTC and evaluate America/Vancouver. `Approved` or `Active` alone does not mean active at the selected time. Omit contact fields.
- Reuse terms: **unresolved; excluded from use** because item licence is absent. Portal Road Ahead licence does not establish terms for the richer unlisted view.
- Spot check: table C, ten public project/location records matched to independent City roadwork listings where available, including expired/future/recurring cases. Project identity can be corroborated; exact curb restriction and daily hours cannot be fully confirmed remotely. Not ten successful E5 safety checks.
- May establish: E5 restricted override/warning only for validated prohibited curb extents while active. A lane closure, reduced lanes or nearby construction is not automatically no-parking. Never free from absence.
- Unknown cases: project envelopes, no exact curb allocation, daily recurrence/end inclusivity, status/date discrepancies, incomplete film/event coverage, no published detail, unparsed schedule, stale successful sync (>24 hours).
- Verdict: **pending criteria 3/4/6/7**. New adapter assessment #37; no loading authorization.

### Road Ahead portal extracts / legacy feeds (E5)

- Publisher / channel: City portal; [current road closures](https://opendata.vancouver.ca/explore/dataset/road-ahead-current-road-closures/), [under construction](https://opendata.vancouver.ca/explore/dataset/road-ahead-projects-under-construction/), [upcoming](https://opendata.vancouver.ca/explore/dataset/road-ahead-upcoming-projects/).
- Geometry and precision: approximate street-segment MultiLineStrings, not curb side. Fields: `project/street/location/comp_date/url_link/geom`; `comp_date` is completion date, not a full interval; linked legacy event URLs may supply detail but access was not established.
- Records: respectively **23 / 68 / 199**; modified **2026-09-17T13:31:44Z / 13:31:46Z / 13:31:48Z**. Stated daily extracts do not mean observed daily content changes. Legacy [Atom](https://vanmapp1.vancouver.ca/georss/roadahead_atom.xml) and [GeoRSS](https://vanmapp1.vancouver.ca/georss/roadahead_georss.xml) state hourly weekday 07–19 updates but returned 403; count/edit/schema/sample unavailable, not “none”.
- Reuse terms: portal OGL-Vancouver recorded; legacy feed applicability not separately established.
- Sample: closure “Manitoba St from W 23rd Av to W King Edward Av”, `comp_date=2027-05-28`, event `14a078dc-e00d-4cd5-b930-770b52c1513d`; under-construction first row has null project/street/location; future W49th row links event `6bcedcfb-9212-4166-9be9-7ccbb55404b4`, completion 2027-03-01 (hosted schedule ends Feb 28 local, showing why completion is not an active interval).
- Spot check: table C supplies ten hosted/project comparisons; portal/hosted same-event joins are replicated evidence, not independent curb/schedule confirmation. Legacy feeds not spot-checkable through successful requests.
- May establish: construction context/warning leads; no free rule. Unknown: missing start/daily hours/curb side, null location, outdated extracts, inaccessible legacy detail.
- Verdict: **rejected as standalone E5 rules (criteria 2/3/4/7; inaccessible legacy feeds also 5/6 unresolved)**; consider hosted candidate under #37 instead.

### Specialized parking: motorcycle, accessibility, carshare (E1/E2 supplements)

- Publisher / channel: City [motorcycle portal](https://opendata.vancouver.ca/explore/dataset/motorcycle-parking/), [accessible portal](https://opendata.vancouver.ca/explore/dataset/disability-parking/), and hosted [non-metered motorcycle](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/COVMotorcycleParkingNonMetered/FeatureServer/0), [DisabilityParking](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/DisabilityParking/FeatureServer/0), [COVCarShareParking](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/COVCarShareParking/FeatureServer/0).
- Geometry and precision: approximate points, not surveyed curb extents. Portal motorcycle **225** edited **2026-10-05T13:31:13Z** (metered/nonmetered mix); hosted nonmetered **86** edited **2026-09-19**; accessibility portal/hosted **163**, portal edited **2026-08-24**, hosted **2026-09-19**; carshare **99**, hosted edited **2026-10-09**.
- Fields used: motorcycle `street/block/time_limit/rush_hour_regulation` plus meter fields for metered rows; hosted `MAPID/STREET/BLOCK/TIMELIMIT/RUSHREG/NOTES`. Accessibility `object_id/location/street_name/block/side/type/description/spaces`; GIS `CADKEY/REGULATION` (sample null). Carshare `CADKEY/COMPANY/ZONE/STNAME/BLOCK/SIDE/SPACES/LOCATION`, no schedule/payment/permission terms.
- Samples: `MOTOR006`, 800 Bidwell, `TIMELIMIT=no/RUSHREG=n/a`; accessible North Side 1000 Alberni, one metered space, no regulation field; carshare `EVO20`, Dunlevy/Railway, east side, two Evo spaces. `no`, `n/a`, null and a reserved company's name do not permit an ordinary car.
- Reuse terms: portal OGL-Vancouver; hosted items CC BY leads pending exact applicability. Spot check: samples and official [motorcycle guidance](https://vancouver.ca/streets-transportation/motorcycles-and-scooters.aspx)/accessible guidance corroborate vehicle eligibility and continued competing rules; no ten complete curb/schedule checks performed, so no approval claimed.
- May establish: supplements for vehicle-specific restrictions when precisely assigned and corroborated, never generic public-free street permission. Unknown: exact footprint, schedule, temporary conditions and company/permit exemptions.
- Verdict: **rejected as standalone complete E1/free evidence (criteria 3/4/7)**. Metered specialized rows stay within #28's gated context work; separate specialized Coverage expansion is outside #21.

### Alternate / historical parking services (rejected)

| Candidate / channel | Geometry, count / edit, fields and sample | Reuse, checks, verdict / Unknown |
|---|---|---|
| [City server GDH/paMeter/1](https://maps.vancouver.ca/server/rest/services/GDH/paMeter/MapServer/1) | Points; 3,543 current query rows; no layer `editingInfo`, record `LAST_EDITED_DATE` available. Current uppercase rate/limit/rush/prohibition fields; sample `571161`, 3 Hr daytime, CVLZ 07–13 seven days. | No source-specific licence confirmed; counts differ from both current hosted/portal. Pending would duplicate #28, so **rejected as selected production input** until provenance/cadence/reuse/reconciliation established (criteria 5/6/7). Not an independent sign check. |
| Older GDH meter views returned during server crawl | Time-limit view 7,713; pay stations 566; accessibility 148; carshare/nonmetered motorcycle 0; crawl showed edit 2025-07-14 and old RATE_M_F/TIME_M_F/PROHIB fields. Later service root returned only layer 1 with modern schema. | **Rejected** criteria 2/4/5/7: unstable observed representation and old snapshot; retry format discovery in #28 before selecting an endpoint. Zero rows does not mean no restriction. |
| [UBC Parking_Meters/0](https://services2.arcgis.com/NlsizNmbMFiinWw4/arcgis/rest/services/Parking_Meters/FeatureServer/0) | 7,946 points, edited 2022-04-11; `meterid/r_mf_9a_6p/t_mf_9a_6p/timeineffe/rate_misc` legacy schema. | **Rejected** authority/freshness criteria 1/5; copy not City-current authority, reuse not assessed, no safety checks warranted for approval. |
| [Olympic restrictions](https://opendata.vancouver.ca/explore/dataset/olympic-transportation-plan-parking-restrictions/) | 25 approximate polygons, edited 2016-06-26; `bi_id/in_effect/geom`, 2010 Olympic period only. | OGL-Vancouver; **rejected** current relevance/freshness criteria 4/5, not current temporary evidence. |
| [Road Ahead historic film permits](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/RoadAheadHistoricFilmPermits_3820d/FeatureServer/0) | 478 polygons; service edited 2026-10-09; `jobid/permitnumber/statusdescription/trafficimpact/startdate/enddate/completeddate/issuedate/giskey`. | Historical status is not current posting; no specific reuse basis/full independent checks recorded. **Rejected standalone current E5**, criteria 3/4/6/7; potential completeness research under #37. |
| Vancouver, Washington ArcGIS search hits | COV_PrkgStall_viewOnly and Parking/ParkingFS or ParkingPUB_staging; latter probes failed. | **Rejected criterion 1 for this jurisdiction**. No BC count/schedule/reuse or spot-check claim; request failure is not absence. |

### Official lot/operator web candidates (E6)

- Publisher / channel: City’s meter guidance identifies City-owned/leased EasyPark lots; [EasyPark directory](https://www.easypark.ca/find-parking/locations-and-lot-information) and [TransLink parking page](https://www.translink.ca/rider-guide/driving/park-and-ride).
- Endpoint / geometry: HTML directories and operator pages; addresses such as Lot 1, 535 Hornby; Lot 47, Vancouver City Hall; Lot 62, Stanley Park. No stable full-rule API, footprint/entrance dataset or normalized per-lot schedule established here. These are candidate families, not a count of accepted lots.
- Records/edit/fields: complete count and edit timestamp unavailable; observed directory fields are lot number/address/name; rate products vary by lot. TransLink facilities are regional, with paid facilities and operator guidelines, not City curb regulations.
- Reuse terms: no data-specific open licence recorded for operator pages; City portal OGL does not automatically license operator websites.
- Spot check: operator/City association and three directory address entries checked; no ten independent complete lot permission/hour/limit checks; no verified-free lot claimed.
- May establish: only precise public lot rules with current hours/limits and explicit operator terms after approval. Unknown: customer/private eligibility, event/seasonal rates, overnight rules, entrance/footprint, freshness and reuse.
- Verdict: **rejected as import-ready E6 (criteria 2/3/4/5/6/7)**. Future lot inventory is outside the metered-curb/permit target; do not substitute OSM fee=no lots.

### Bylaw / unsigned-street guidance (E7)

- Publisher / channel: City bylaws and official unsigned-street page linked in search log.
- Geometry/records/edit: textual sections, not spatial records; no location dataset or complete revision date established; unsigned guidance records November 2023 amendments. Sections constrain behavior, not a citywide permission polygon.
- Fields/semantics: section 17.6(f) describes a three-hour daytime constraint for nonresidents/nonworkers, with exemptions; sections 17.2/17.5/19.1 include unsigned hydrant/access/intersection/lane prohibitions. Meter guidance specifies payment 09–22 daily including statutory holidays and checking signs/temporary conditions.
- Reuse terms: City public guidance/code publication, no separate machine-readable bulk licence established; public access is not a reuse grant for a dataset.
- Spot check: official unsigned page confirms exceptions beyond signed zones; bylaw references checked, no ten precise permission checks because qualifying default fails first.
- May establish: constraints/context; policy E7 permits only a weaker allowed-unless-signed statement where signs are the only exceptions. Never Verified Free.
- Unknown: exact statutory geometry, posted restrictions and context exemptions. Verdict: **rejected as qualifying E7 default**, policy signs-only-exceptions condition fails; do not turn the three-hour maximum into permission.

### Parking ticket data (signal only)

- Publisher / channel: City Parking Operations and Enforcement, [current](https://opendata.vancouver.ca/explore/dataset/parking-tickets/), [2020–25](https://opendata.vancouver.ca/explore/dataset/parking-tickets-2020-2025/); older 2010–13, 2014–16 and 2017–19 portal archives.
- Geometry and precision: no geometry; locations aggregated to 100-block units, no curb side. Excludes Police-issued tickets, includes water/test records; status is original issuance, not current disposition.
- Records/edit: current **237,792**, edited **2026-07-15T13:50:32Z**, quarterly extract; 2020–25 **2,472,917**, edited **2026-06-01T23:08:21Z**, past-year data static. Archives: 2010–13 **1,091,149**, edited 2019-08-07; 2014–16 **1,169,233**, edited 2019-08-06; 2017–19 **1,318,735**, edited 2025-07-15.
- Fields: `bi_id` warehouse identity, `street/block/entrydate/year/bylaw/section/infractiontext/status`; historic aggregates below filter 2024/25, text containing SIGN. One block can include many offence types and both sides.
- Reuse terms: portal OGL-Vancouver recorded. Spot check: table B cross-checks block-level signed-restriction signals; not proof of present permit rules or exact addresses. Sample 1000 Bidwell aggregate: 61 SIGN-text tickets across 2024/25; no individual driver information retained.
- May establish: warning/Unknown lead only. Unknown: present signage, exact curb, current offence disposition and whether a sign still exists. Verdict: **rejected as rule evidence by policy**, eligible only as a signal; never promote citations or their absence to permission.

## Spot-check fixtures and results

### A. Meter portal ↔ second official hosted layer (12 distinct locations)

Snapshot comparison uses `meter_id=METER_ID`; blank/null equivalence is only for comparing exports, **not** a parser permission default. Checked rates, all four limits, flat rate, both rush windows, both prohibition slots, vehicle/status and both override flags. Coordinates identify public City assets, not driver locations; fetch by meter ID for exact geometry. Official general guidance is independent publication, while GIS/portal are likely replicated City source systems. No on-site signs inspected.

| Meter ID / source location | Safety-relevant fixture | Result / remaining check |
|---|---|---|
| 081034 / Downtown point | $5/$3.50, 2/4 Hr; AM 07–09:30 and PM 15–18 | Fields agree; 08:00 must never become free from absent payment. Rush days and exact curb still unconfirmed. |
| 070815 / Strathcona-area point | $2/$1.50, 2/4 Hr; AM 07–10 | Fields agree; don't truncate rush end to 09:30. |
| 512404 / Main/E10-area point | AM 07–09:30; LOADING ZONE Mon–Sat 09:30–18 | Fields agree; loading continues after rush ends; no 10:00 free recommendation. |
| 990114 / Main/E11-area point | NO STOPPING Mon–Fri 07–19; null daytime limit, override Yes | Fields agree; null/override cannot be guessed unlimited. |
| 110116 / Beatty-area point | PASSENGER ZONE seven days 18–02; override Yes | Fields agree, including weekend 4 Hr; overnight prohibition extends beyond payment hours. |
| A10599 / E6-area point | Motorcycle; $0.75/$0.75; No Time Limit | Fields agree; passenger car is ineligible; no-time-limit is not permission. |
| B50415 / W6-area point | Accessibility; $2/$1.50, 2/4 Hr | Fields agree; accessible permit context and payment remain required. |
| B20226 / W4-area point | PM 15–18; time-limit override Yes; weekend daytime 4 Hr | Fields agree; override semantics pending. |
| 540411 / W Pender-area point | Slot 1 loading Mon–Fri 09–18; slot 2 taxi seven days 18–02; prohibition override Yes | Both slots agree; must parse both, never discard overnight taxi. |
| 300524 / Broadway-area point | Removed, with AM/PM rush windows and paid rates still populated | Fields agree; historical fields do not justify serving a removed meter. |
| B70219 / W8-area point | No rush/prohibition fields; No Time Limit; $10 flat-rate option | Fields agree; candidate after-hours regression only after schedule/extent/temporary completeness verified. |
| 642315 / W41st-area point | Weekend daytime portal 3 Hr versus hosted 4 Hr | **Contradiction**; criterion 7 fails for approval until reconciled. |

Complete ID comparison: 13 portal-only IDs (`642304`, `642306`, `642308`, `642310`, `642311`, `642313`, `642317`, `642319`, `642401`, `642403`, `642405`, `642514`, `642516`), four hosted-only IDs (`5302WPB`, `6423EPB`, `6424WPB`, `6425EPB`). This may reflect equipment/pay-station transitions; no inference of removed spaces from these snapshots alone. A projection of daytime/evening rate, weekend daytime limit and status across common IDs found the `642315` conflict above; this is not a full all-field diff of every common meter. Choose the approved source and reconcile history in #28.

### B. Permit-zone location probes and independent signals

Use official [street-intersections](https://opendata.vancouver.ca/explore/dataset/street-intersections/) coordinates (`xstreet` query), then point-intersect ResidentialParkingPermitZones with `inSR=4326`. The second location layer confirms placement, not permission. City permit web guidance independently names West End Plateau/Robson North and warns its map is a guide subject to change. Historical ticket aggregates independently establish warning signals, not current rules.

| Distinct official location | Polygon result | Independent official corroboration / limit |
|---|---|---|
| Barclay/Bidwell | RPP025 West End Plateau | 800–1300 Bidwell blocks have historical SIGN-text offences; exact curb hours unknown. |
| Robson/Bidwell | RPP019 Robson North | Permit page names Robson North; boundary differs from RPP025, no whole-West-End blanket. |
| Comox/Bute | RPP025 | 1300 Comox: 20 SIGN-text tickets in 2024/25; no exact curb/date rule inferred. |
| Haro/Bidwell | RPP025 | 1000 Bidwell: 61 SIGN-text tickets; intersection itself is not a legal parking space. |
| Bute/Barclay | RPP025 | 1100 Barclay: 230 SIGN-text tickets; location-specific sign semantics unresolved. |
| Bute/Haro | RPP025 | 1100 Haro: 89 SIGN-text tickets; block-level signal only. |
| Comox/Jervis | RPP025 | 1400 Comox: 68 SIGN-text tickets; permit page corroborates program only. |
| Jervis/Barclay | RPP025 | 1200 Barclay: 33 SIGN-text tickets; no curb-side match. |
| Nicola/Haro | RPP025 | 1400 Haro: 25 SIGN-text tickets; current signage unconfirmed. |
| Barclay/Nicola | RPP025 | 1500 Barclay: 43 SIGN-text tickets; current signage unconfirmed. |

Additional regression **1000 Bidwell**: no exact `civic_number=1000, std_street=BIDWELL ST` property-address record returned. A representative point interpolated between official 950/1050 Bidwell property coordinates is `(-123.13686855, 49.28819891)` and intersects RPP025. This reproduces the **1000-block zone association**, not exact rooftop/curb/sign permission. Official 1100 Bidwell and 1100 Jervis property points also intersect RPP025. Exact 1000 Bidwell curb/sign confirmation remains pending #29; do not present the representative as surveyed evidence. Comox/Bute is a directly retrieved official intersection point, not interpolation.

Citation query: dataset `parking-tickets-2020-2025`, `year in ('2024','2025')`, named streets, `infractiontext like '%SIGN%'`, select `street,block,count(*)`, group by `street,block`. These counts combine all SIGN-text offences; they do not identify RPP violations specifically. No contradiction in sampled zone **membership** established; absence of curb/hour evidence still fails approval criterion 7.

### C. Road Ahead samples ↔ independent City project listings (10 places)

Compared project/location candidates to the City's roadwork listing linked above. Identity agreement is narrower than confirmed no-parking extent or active dates; none of these rows is approved E5. Public `planitid` provides reproducible fixtures without contacts.

| planitid / public project location | Hosted observation | Independent result / limit |
|---|---|---|
| b522f6b4-468b-4acc-938a-db17f4518a47 / Nanaimo E41–E37 | Parking Lane Closure, Jul 20–Aug 31 2026; today=N | No exact project/schedule confirmation in City listing; expired envelope, not active parking rule. |
| a6b21e28-4880-4bda-81ba-221647916beb / Main–Terminal | “Active” status, Mar 2025–Aug 1 2026; today=N | City lists separate fall Terminal repairs; do not merge old/new phases or trust Active alone. |
| 6bcedcfb-9212-4166-9be9-7ccbb55404b4 / W49 Columbia–Cambie | Future Oct 26 2026–Feb 28 2027, Reduced Lanes | City W49/Alberta program listing corroborates broad area, not exact transfer phase/curb. |
| e34992b4-0e20-4bf7-8db3-c011cff9de10 / St George E Broadway–E8 | Parking Lane Closure; end Sep 30; today=N | City Rainway listing agrees project identity, not an active Oct 9 restriction. |
| 57f0264d-2adf-42a4-9e22-9c8b087d246f / Nanaimo East Kamloops | Full Closure; Dec 2025–Dec 2026; weekdays 07–17 | City lists project; recurrence and individual curb scope still pending. |
| 7a199adc-5919-465f-85b9-a454c728ae41 / Georgia–Dunsmuir viaduct | Lighting-mast placeholder; Sep 28–Nov 30, Reduced Lanes | City lists viaduct rehabilitation; lighting placeholder is not proof of same closure. |
| f72258a1-0e4d-4c7d-86b5-f70649199f50 / Cambie Bridge / Pacific–Nelson | Electrical scope; Aug 3–Oct 30, Reduced Lanes | City bridge-upgrade listing agrees program only; curb extents unconfirmed. |
| 9f5e15ce-f10f-4965-9231-efed6174d208 / W49/Alberta phase 1 | Apr 2025–Dec 15 2026, Reduced Lanes | City listing agrees location/program; several streets, not universal no-parking. |
| fbd85804-d2a3-43e8-a8d1-a440d6e4c21c / BC Hydro - Utility Maintenance on 400 Block Drake St | Parking Lane Closure; Oct 21, 2026 - Oct 22, 2026; W - Th; 9:00 PM - 5:00 AM | City lists Drake Street upgrades, a different work type from this BC Hydro event; no independent event/schedule confirmation. |
| a73bb5fd-ded3-43ce-8cc7-7b023ee1fc3a / Davie Street Upgrades | Alternating Traffic; Sep 23, 2026 - Sep 25, 2026 | City lists Davie Village upgrades; exact phase, schedule and curb allocation remain unconfirmed. |

Some comparisons show different project phases rather than safety contradictions resolved in favor of a source. Ten project-location checks are recorded; ten independent precise E5 schedule/curb checks remain **pending**, not waived. Do not use approximate geometry or absent reservations to recommend free.

## Acceptance assessment (each policy criterion)

A pass here assesses a candidate property, **not** source approval. “Pending” names the missing evidence; rejected sources above fail their stated criteria.

| Criterion | Meter portal | Permit zones | Road Ahead hosted |
|---|---|---|---|
| 1 Authority | Pass: City portal | Pass: City GIS item/channel | Pass: City item and official map/program |
| 2 Stable machine format | Pass candidate: explicit IDs/fields, validate every sync | Candidate pass with repeated MAPID + part geometry; export OBJECTID not sole identity | Candidate pass with planitid + geometry/interval; validate serialized format |
| 3 Precise location | Pending meter/pay-station curb allocation and metadata discrepancy | Pass polygon minimum; signed applicability remains pending under 4/7 | Pending exact parking curb extent within project polygons |
| 4 Schedule semantics | Pending rush days, override flags, flat rates and unsupported cases | Pending: no enforcement/visitor hours in fields | Pending recurrence/all-day/end/status semantics |
| 5 Freshness signal | Pass signal: modified and weekly cadence; actual runtime sync still required | Pass signal: service edit; actual runtime sync still required | Pass signal: service/record edits; actual daily sync still required |
| 6 Reuse terms | Pass portal OGL; alternate GIS applicability pending | **Pending published CC BY version/scope in #24; excluded from use** | Excluded from use: no published terms for unlisted view |
| 7 Ten independent zero-contradiction checks | Pending: 12 comparisons; one weekend-limit conflict, no precise sign checks | Pending: ten locations + named regressions; only membership/program/signals checked | Pending: ten project probes; exact temporary curb/time confirmation unavailable |

## Unknown areas and gaps

- **Present Coverage is none.** No approved source exists in this inventory. The proposed partial subset is a future approval target, not permission to load or claim Coverage. Full requires E1 (or complete E3 plus qualifying E7), payment/permit and daily precise E5; Vancouver cannot claim that today.
- All unmetered streets outside confirmed signed permit curbs remain Unknown, including residential-road/OSM-only blocks. Polygon absence, missing meters, permit fees, citations and generic three-hour limits do not create free rules. Inside a permit eligibility polygon, actual curb hours/visitor/exemption conditions are also unconfirmed.
- Meter free-after-hours eligibility is limited to exact metered curb portions with approved complete schedules/prohibitions/time limits, usable service status, matching vehicle context, reconciled feed conflicts and competing temporary/permit rules. Never color an entire block from one meter or pay station. Both prohibition slots and overnight periods override payment gaps.
- Portal/hosted `642315` limit conflict and equipment-ID drift must be resolved before approval; source format and source selection are #28 work. Rush-day/holiday semantics and override precedence require authoritative documentation. Meter 081034 at 08:00 is a regression against unsafe free inference, not a fully verified current schedule.
- Permit licence/version/scope confirmation, exact 1000 Bidwell curb evidence, RPP/RPO/VRPP sign application and zone visitor hours remain #24/#29 evidence and independent agent-review gates. The CC BY lead is recorded but is not a waived permission gate. Do not overrestrict an eligible accessible vehicle or infer a visitor allowance from the ability to buy a visitor permit.
- Road Ahead portal freshness and hosted extent/recurrence/reuse/completeness remain unresolved. No full or temporary-safe promise follows from today's export date; E5 must sync within 24 hours under #2, otherwise temporary restrictions are unknown. The City accessible map explicitly omits short-term construction/event changes.
- Rejected lots, specialized feeds, historical layers and E7 cannot enlarge the target subset. Current official operator lot permissions require a separate inventory. The location checks here do not observe vacancy.
- No new policy evidence type is needed: existing E2/E4/E5 precision/schedule rules already cover the discovered gaps. Approval should explicitly resolve how mixed-sign eligibility polygons interact with #29’s blanket restricted regression expectation; do not silently change #2's policy.

## Tickets

- [#21 inventory](https://github.com/BinaryDevil/find-free-parking/issues/21): inventory research integrated in [PR #38](https://github.com/BinaryDevil/find-free-parking/pull/38); criteria reconciled below. Source approval is separate.
- [#24 approval / permit reuse](https://github.com/BinaryDevil/find-free-parking/issues/24): independently verify published terms covering the exact item and all seven criteria under ADR-0005; record author/reviewer evidence before approval. No permission inquiry.
- [#28 current meter adapter](https://github.com/BinaryDevil/find-free-parking/issues/28): table A fixtures, exact current fields, both prohibitions, rush-day/override semantics, service status, vehicle context and feed reconciliation. Existing ticket reused.
- [#29 permit-zone adapter](https://github.com/BinaryDevil/find-free-parking/issues/29): table B fixtures and exact-sign limitations; reuse gate remains. Existing ticket reused.
- [#37 Road Ahead assessment](https://github.com/BinaryDevil/find-free-parking/issues/37): missing E5 adapter follow-up; table C fixtures, schedule/extent/reuse/completeness gaps. Blocked by schema/evaluator and source approval; no data writes authorized.
- [#2 spec](https://github.com/BinaryDevil/find-free-parking/issues/2), [#23 policy ADR](https://github.com/BinaryDevil/find-free-parking/issues/23), [#11 evaluator](https://github.com/BinaryDevil/find-free-parking/issues/11), [#15 source sync](https://github.com/BinaryDevil/find-free-parking/issues/15), [#33 go-live](https://github.com/BinaryDevil/find-free-parking/issues/33): source inventory does not complete implementation, release or production verification.

Existing adapter/approval issues are linked rather than duplicated. Missing E1/E3 evidence for a **full** target remains a documented gap; ADR-0004 prohibits data-request tasks. Inventory remote comparisons can be reviewed now; source approval still requires the policy’s independent checks with zero safety contradictions. No unavailable check has been represented as passed.

## Adapter implementation evidence (#28, 2026-10-14)

The portal adapter is `lib/vancouver-meters.ts`. Its chosen format is the current lower-case Explore v2.1 format above, not the hosted uppercase format or historical `meterid/r_mf_9a_6p` format. `createVancouverMeterAdapter` returns the narrow #15 `SourceAdapter` shape: a complete snapshot of meter places in America/Vancouver with raw records and typed rules. It checks the published count and edit timestamp before/after stable-ID pagination, rejects truncated/duplicate/changed responses, and excludes `Removed` records. The shared sync runner must atomically retire missing places/rules from serving while preserving history; the adapter performs no writes. A record parser alone makes no completeness claim.

Recorded public fixtures under `tests/fixtures/vancouver/` were retrieved on 2026-10-14 (Vancouver time): `/records?limit=20` and `/records?limit=20&where=am_rush_hours is not null or prohibition_1_zone is not null`. These are sample pages, not complete feeds. Attribution: City of Vancouver, [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/). Tests transform copies into explicitly synthetic cases; they do not approve these real meters. Current metadata at retrieval reported 3,507 rows and data modified 2026-10-12T06:31:51-07:00; the earlier inventory counts above remain dated historical observations.

Strict record checks reject missing/currently renamed fields or incorrect primitive types. Unknown values, null limits, flat-rate options, undocumented overrides, incomplete prohibition triples, unknown zones/vehicles and out-of-service meters retain an unparsed rule and raw data, so evaluation remains Unknown. Both prohibition slots, `7 Days a Week`, weekday ranges, `to` time ranges, Noon/Midnight, Anytime and overnight windows are supported. Motorcycle conditions are respected. Specialized zone exemptions have not been established; zone rules conservatively prohibit ordinary parking without granting any exception.

Rush fields still lack days. The adapter accepts optional per-record reviewed semantics only when an exact copy of the current raw record matches and an evidence reference is supplied; no real review entries are supplied or registered. An after-hours free rule additionally requires an explicit reviewed permission and limit for that meter, establishing precise curb assignment, completeness of all applicable prohibitions/limits and positive permission in the same official feed's semantics. Null prohibition fields alone do not suffice. A changed record invalidates its review. Source approval/freshness remain independently enforced by the evaluator and sync runner; a semantics review is not source approval.

Synthetic evaluator regressions verify 08:00 rush → Restricted, 10:00 → Paid, loading/second-slot/overnight restrictions, explicit after-hours permission → Verified Free, and ambiguity/pending approval → Unknown. Real rush-day, curb-extent, override, independent spot-check and source-approval gates remain unresolved under #24. No permit/Road Ahead adapter, source activation, database write or production change is included.

## Inventory completion reconciliation (#21, 2026-10-19)

[PR #38](https://github.com/BinaryDevil/find-free-parking/pull/38) merged the research into dev on 2026-10-09 (Vancouver time), commit ffe90bcd71a0bdaeab756bf56d49fe80b8b63d8d. Reconciliation against dev a66b54d9e97fcf6cd724050a06f26649004bed1c preserves that research rather than treating historical counts or comparisons as freshly retrieved evidence.

| #21 merge criterion | Recorded evidence |
|---|---|
| Every candidate has verdict, spot checks, reuse terms and Unknown cases | Discovery accounts for E1–E7 and signals; Sources records candidate assessments; tables A/B/C record 12 meter, 10 permit-location and 10 temporary-project comparisons, with unsuccessful safety checks explicit. Table B includes RPP025, Comox/Bute and the limited 1000 Bidwell representative; table A includes rush-hour meters. |
| Permit-zone service pending until reuse is established | Permit source remains pending criteria 4/6/7 and excluded from use while exact published reuse terms are unresolved. ADR-0004 rules out permission requests; #24 independently reviews available published evidence under ADR-0005. |
| Draft Coverage subset precise | The draft partial target above names only validated meter curb portions and independently confirmed signed permit curb restrictions. Present Coverage remains none; neither polygons nor inventory completion establish Coverage. |

Inventory completion does not pass source acceptance criterion 7: replicated meter comparisons include a limit conflict; permit probes establish membership rather than current signed curb rules; Road Ahead project comparisons do not establish precise curb/time restrictions. These failures remain visible for #24 and the existing adapter tickets #28/#29/#37. No source is approved, loaded or activated by this reconciliation. No production release check arises from this documentation-only completion.
