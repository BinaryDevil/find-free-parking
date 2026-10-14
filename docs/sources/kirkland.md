# Kirkland, Washington: source inventory

Status: draft
Timezone: America/Los_Angeles
Coverage verdict: none (no approved source; not covered)
Draft partial target: exact City-regulated curb segments with every applicable sign assigned, current complete schedules and vehicle/permit conditions reconciled. No unsigned-street or citywide Coverage claim.
Policy: [ADR-0002: Evidence Source Policy](../adr/0002-evidence-source-policy.md)
Observed: 2026-10-14. Counts describe source records, not spaces, imports or vacancy.

Independent inventory portion of [#32](https://github.com/BinaryDevil/find-free-parking/issues/32). Parser, block-side assignment and adapter acceptance remain blocked by [#11](https://github.com/BinaryDevil/find-free-parking/issues/11). This document specifies evidence requirements, not an invented rule schema. No source approval, loading, registry change, database write, city contact or deployment occurred.

## Evidence types

| Type | Source(s) | Search result / limit |
|---|---|---|
| E1 Block-level regulations | RegulatedStreetParking | Found 258 curb lines; limited assessment scope, proposed spaces and currentness unresolved. |
| E2 Meter / payment feed | Parking_Meters_view; official lot guidance | Six payment-device points, no tariff/schedule feed. Rejected as a standalone E2 rule feed. |
| E3 Sign inventory | Traffic_Signs_view; Sign_Base_view; downloadable ST archive | Found sign points/text. Completeness and precise sign-to-curb assignment unproven; absence remains Unknown. |
| E4 Zone polygons | Juanita permit guidance/map | No queryable permit-enforcement polygon feed found; named signed streets are a discovery lead, not approved E4 geometry. |
| E5 Temporary restrictions | City traffic alerts, temporary street-use and special-event guidance | No complete precise machine-readable active curb reservation feed found. |
| E6 Lots / operators | PaidParkingLots; City lot pages; Metro park-and-ride directory | Five City polygons; schedules/conditions need reconciliation. Transit leads excluded from this curb target. |
| E7 Bylaw default rule | City-linked KMC chapter 12.45; neighborhood guidance | Code retrieval blocked; no verified signs-only-exceptions default. Unsigned legal exclusions apply. |
| Signals | Painted curbs; parking sensor pilot; citation searches | Curb markings can flag restrictions; sensors/absence of citations never establish permission. No public geolocated citation dataset found. |

### Discovery log (policy order)

1. [City IT catalogue](https://www.kirklandwa.gov/Government/Departments/Information-Technology) links the [official GIS downloads](https://inter.kirklandwa.gov/gisdata/AllData/) and mapping tool. Reviewed StreetUtilities/GDB/ST.zip and Transportation/GDB/TRN.zip listings, licence text, existing repository ST sign metadata and current hosted service metadata. Archive listings exposed sizes but no edit dates; archives were not imported or treated as current runtime data.
2. Ran inspected read-only discovery against the [hosted organization root](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services): **149 services**. Direct organization sign search found the public sign/base views that parking-only search omitted. The [City host server](https://maps.kirklandwa.gov/host/rest/services) crawl returned HTTP 403; the web reader returned a directory representation, but did not enable a complete live folder/layer crawl. This is a discovery limit, not a claim that server has no sources.
3. Ran `scripts/discover_city_sources.ts Kirkland`: ArcGIS found painted curbs, meters, regulated curbs and sensor layers; Socrata returned none. Direct ArcGIS `orgid:loGMwowmR0OPlOQb sign` returned ten items. Non-Kirkland sign search hits (including another organization's Signs service) were not accepted as City authority.
4. King County and data.gov parking searches found regional transit/road information, no additional Kirkland curb-rule feed. Unincorporated County road closures cannot establish City curb restrictions.
5. [Metro parking directory](https://kingcounty.gov/en/dept/metro/rider-tools/parking-locations) lists Kingsgate, Kirkland Way and Holy Spirit Lutheran Church facilities; it says the Kirkland Transit Center provides no transit customer parking. Separate operator conditions, entrance/footprint, currentness and reuse review are required. South Kirkland's name does not establish jurisdiction; the County describes its facility as in Bellevue. No transit lot is included in the proposed curb subset.
6. Followed [City Codes and Laws](https://www.kirklandwa.gov/Government/Codes-and-Laws) to [KMC 12.45](https://www.codepublishing.com/WA/Kirkland/html/Kirkland12/Kirkland1245.html); direct retrieval returned 403 and the web reader's modernization redirect failed. Reviewed [City neighborhood guidance](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Getting-Around-Transportation-Division/Neighborhood-Traffic-Control), which identifies unsigned distance/obstruction exclusions and red curb markings. The linked permit-map image could not be independently retrieved by the web reader (cache miss); named-street checks use the page text, not a claimed polygon extraction. No general 24/72-hour rule is asserted from unavailable code or community posts. The records index also lists September 2026 parking/impoundment ordinance O-4946; reconcile enacted amendments before relying on older code.
7. City parking enforcement, organization/city catalogue and public citation searches found no public geolocated citation feed. Enforcement and employee-permit pages returned 403. No personal ticket lookup performed.
8. [City public-records channel](https://www.kirklandwa.gov/Government/Departments/Finance-and-Administration/City-Clerk/Request-Public-Records) accepts GIS/Public Works records requests. Human preparation below covers completeness, mapping, currentness, permit and temporary restrictions; no request sent.

## Method and reuse scope

Query each layer with `?f=json` for fields/domains/editingInfo, then `/query?where=1%3D1&returnCountOnly=true&f=json`. Record queries use explicit public fields, `orderByFields=OBJECTID`, `resultOffset`, `resultRecordCount=1000`, `outSR=4326`, `returnGeometry=true`, `f=json`; continue until `exceededTransferLimit` is false. Full public sign pagination returned 16,454 records. Native hosted sign spatial reference is 102748 (Washington North feet); comparison coordinates were transformed by ArcGIS to WGS84.

Service `editingInfo` dates below are source snapshot edits, not inspection dates for every sign or runtime sync dates. No public sign record timestamp/cadence was exposed. Future approved E1–E4/E6 syncs must meet the seven-day policy limit; E5 requires 24 hours. Format failures stop sync and degrade to Unknown.

The [download directory licence](https://inter.kirklandwa.gov/gisdata/AllData/_disclaimercopyright.txt) offers ODbL 1.0 for its databases/contents. However, the repository's older ST_Signs metadata says general mapping only and prohibits commercial purposes; its metadata sync/modification is 2025-01-17. Hosted Traffic Signs/Base and PaidParkingLots item licence fields are null; RegulatedStreetParking is blank; ST_CurbPainting says all rights reserved. **Do not silently extend archive ODbL to hosted views or resolve contradictory legacy terms.** Human approval must record exact source/version scope, attribution and applicable derivative-database obligations or written permission. Public access does not resolve this conflict. No bulk fixture export is added here; examples are small public evidence excerpts and omit editor identities.

## Sources

### Traffic Signs view (E3)

- Publisher/channel: City of Kirkland GIS organization, item [a4f70e4c9ff548f9b3c128257dc67353](https://www.arcgis.com/home/item.html?id=a4f70e4c9ff548f9b3c128257dc67353); endpoint: [Traffic_Signs_view layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Traffic_Signs_view/FeatureServer/0).
- Geometry/precision: sign points, not regulated curb extents. No street-segment key, facing direction, arrow field, sign-base join or lifecycle field is exposed by this view.
- Records: **16,454**, source edited **2026-07-14**; **2,030** null/empty SIGNTEXT values. **2,652** records match case-insensitive PARK, LOADING, TOW or STOPPING; this is a research filter, not an authoritative parking-sign count (it includes park guidance).
- Fields: `OBJECTID` query selector; `GlobalID` provenance key candidate; `SIGNTEXT` literal public legend; `OWNERSHIP`/`MAINT` coded authority/maintenance, not permission; geometry. Codes include City Transportation (`TRN`), Parks (`PARK`), Public Works (`PW`), private (`PRIV`), Bellevue (`BELL`) and unknown (`UNK`). Verify jurisdiction and controlling authority; maintenance alone is insufficient.
- Reuse: pending hosted-view scope and archive/legacy conflict above.
- Spot check: twelve-location attempt below; four nearby curb comparisons support individual attributes, while other comparisons expose missing extents, incomplete semantics or possible outdated lot signs. Criterion 7 has **not passed**.
- May establish: E3 rules only when all applicable signs on the precise block side are parsed and assigned, with current schedules/vehicle conditions.
- Unknown: blank/unparsed text, missing days/holidays, school-calendar and overnight ambiguity, unknown arrows/endpoints, other signs on the same pole/curb, uncertain ownership, stale records, or unproven completeness. No-recorded-sign blocks remain Unknown.
- Verdict: **pending** criteria 3–7: assignment, schedule/completeness, currentness clarification, reuse and zero-contradiction checks.

### Sign Base view / legacy ST export (E3 support, not an independent rule feed)

- Endpoint: [Sign_Base_view layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Sign_Base_view/FeatureServer/0); downloadable ST archive under the official catalogue above.
- Geometry/records: **9,552 points**, edited **2026-07-14**. Public base fields are `OBJECTID`, `OWNERSHIP`, `MAINT`, `GlobalID`; no legend or exposed common sign key.
- Local legacy GeoJSON contains **16,181 signs** and fields such as `ASSET_ID`, `SEGKEY`, `STKEY`, `SIGN_POS`, `DRIVE_DIR`, dates and `SIGNTEXT`. This is a repository snapshot, not a live source count; existing keys are not assumed available or documented in the hosted view.
- Reuse: ODbL directory versus legacy commercial-use prohibition requires exact version/scope decision.
- Spot check: co-location/record count does not prove a base join or completeness; no independent ten-place rule checks passed for this support source.
- May establish: support exact assignment only with documented join/direction/extent semantics, never a rule from a bare pole.
- Unknown: joined signs, removed/added assets, direction and ID stability between archive/view versions.
- Verdict: **rejected as standalone rules** (no schedules/text); pending only as assignment support within #32, not a second rule adapter.

### RegulatedStreetParking (E1 candidate)

- Endpoint: [RegulatedStreetParking layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/RegulatedStreetParking/FeatureServer/0); item [e75f64881e58468ab164d8fe85583243](https://www.arcgis.com/home/item.html?id=e75f64881e58468ab164d8fe85583243), City organization.
- Geometry/precision: **258 curb polylines**, stated three-foot accuracy from a 2018 on-street ADA assessment. Scope includes time-limited, accessible, motorcycle and loading spaces, not all prohibitions or citywide complete regulation.
- Dates: service/maximum queried `EDIT_DATE` **2025-12-24**; item narrative says field accuracy as of **2018-08-20**. Require explicit currentness reconciliation; republication is not evidence that every field was re-inspected.
- Fields: `OBJECTID`, `GlobalID`, `BLOCK_NUMBER`; `DURATION` codes 1=30 minutes, 2=1 hour, 3=2 hours, 4=4 hours, 5=Other, 6=Unspecified, 7=15 minutes; `TIME_FRAME` 1=09:00–19:30 except Sundays/holidays, 2=09:00–20:00 except Sundays/holidays, 3=Other. `ADA_PKNG`, `MCYCL_PKNG`, `LOADING_ZONE` identify conditions; `NOTES` supplements them; `EXISTING_PROPOSED` 1=Existing, 2=Proposed; `EDIT_DATE` source metadata. Capacity/angle/ADA improvement priority are not permission.
- Sample: **724**, block 24, DURATION=3/TIME_FRAME=1, Existing, near sign 2838624. **25** features are Proposed, **8** have null lifecycle; exclude both without proof of implementation. DURATION=Unspecified appears in **102** records.
- Reuse: blank item licence; directory scope not confirmed.
- Spot check: table below supports selected two-/four-hour and motorcycle attributes, not complete applicable rules. Opposite/adjacent curbs cannot be joined by nearest distance alone.
- May establish: precise approved E1 conditions only after currentness and all overlapping prohibitions are reconciled.
- Unknown: Other/Unspecified/null codes, proposed features, missing payment/prohibition fields, holiday definition, undocumented block IDs and old field assessment.
- Verdict: **pending** criteria 3–7 and explicit currentness/source scope; never an approved replacement for complete E3 evidence.

### Parking Meters view (E2 lead)

- Endpoint: [Parking_Meters_view layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Parking_Meters_view/FeatureServer/0); City GIS.
- Geometry/records: **6 payment-device points**, edited **2026-07-14**; `OBJECTID`, `NAME`, `GlobalID`. Sample **3581**, LAKE ST/CENTRAL AVE.
- Reuse: no explicit hosted-view licence established.
- Spot check: device location agrees broadly with paid-lot geography; no ten-location tariff/prohibition validation possible from six device records.
- May establish: payment-device context only in this form. A device point does not define paid curb extent.
- Unknown: rates, enforcement days/hours, holidays, limits, exemptions and all prohibitions absent.
- Verdict: **rejected as standalone E2 rules** (criteria 3/4 incomplete). No free-after-hours or nearby unmetered permission inference.

### PaidParkingLots / City lot guidance (E6 candidate)

- Endpoint: [PaidParkingLots layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/PaidParkingLots/FeatureServer/0); City GIS, item [03f4fab99ce1467c97e653bccff0833e](https://www.arcgis.com/home/item.html?id=03f4fab99ce1467c97e653bccff0833e); [official parking guidance](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information) and [garage page](https://www.kirklandwa.gov/City-Facilities/Peter-Kirk-Parking-Garage).
- Geometry/records: **5 polygons**, edited **2026-02-24**. Fields `OBJECTID`, `Name`, `Hours`, `PermitTypes`, `Notes`, `Lot_Type`, geometry. No GlobalID exposed; validate stable semantic identity across republishes.
- Samples: 1 auxiliary, 2 marina/Lakeshore, 3 Lake & Central have null hours/permit fields; 4 Peter Kirk garage has general 05:00–midnight, permit 05:00–17:00 and distinct permit/general/ADA/EV stalls; 5 Lakeshore Plaza Drive says 09:00–21:00/Paid, no days/rates. Lot names/types are not a full rule.
- City guidance provides paid-lot schedule/tariff and visitor/employee/EV distinctions; reconcile per lot and effective date, including stale mixed-payment sign text below. Do not apply general garage permission to assigned permit, ADA or charging stalls.
- Reuse: pending hosted polygons and page-derived schedule scope.
- Spot check: lot geography/guidance support paid examples; twelve-sign table does not establish ten independently validated lot locations or all internal stall conditions.
- May establish: only lot-specific rules after approved operator conditions and exact applicable footprint/stalls. Never street permission.
- Unknown: partial free-duration stalls, permit/employee restrictions, vehicle eligibility, holidays, overnight closure and unresolved sign/page differences.
- Verdict: **pending** full per-lot semantics, stable identity, reuse and independent checks; E6 follow-up is separate from #32 curb adapter.

### Painted Curbs / sensors / other rejected candidates

- [Painted_Curbs_view layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Painted_Curbs_view/FeatureServer/0): **1,715 polylines**, edited **2026-10-01**; `OBJECTID`, `GlobalID`, `CURB_COLOR` 0=Red/1=Yellow/2=White, `CURB_TYPE`, `LENGTH`. Sample OBJECTID **1** has CURB_COLOR=0; colour alone has no complete schedule/vehicle semantics. Source ST_CurbPainting exposes street/segment context but all-rights-reserved item terms. **Rejected as complete E1/E3 rules**, usable only as restriction/association checks after semantic/reuse review; no ten independent checks passed.
- [KirklandParkingSensors layer 0](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/KirklandParkingSensors/FeatureServer/0): **531 points**, edited **2026-06-01**; stall/type/duration/pay flags and IDs, no complete enforcement schedule. Status joins have **531** or **528** records and edit **2026-10-14**. **Rejected as permission/coverage evidence**; sensor occupancy is outside this service's rule-only promise and is not imported. Reuse pending; no independent rule checks passed.
- [City Juanita permit guidance](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information) (Juanita section of the parking page) / [linked permit map](https://www.kirklandwa.gov/files/sharedassets/public/v/1/public-works/public-works-images/juanita-parking-permit-map.jpg): **rejected as import-ready E4** (no stable queryable polygon/hours/visitor semantics). Counts/edit date not exposed; reuse and precise signed extent pending. General neighborhood guidance is **rejected as E7 Verified Free or qualifying signs-only default**; no machine-readable precise permission or complete current legal conditions established.
- City temporary street-use/event pages and parade traffic alerts: **rejected as complete E5 feed** (no complete daily stable reservation IDs and exact curb extents); individual dated official notices can inform warnings once scope is established. No record count/cadence or ten checks established; no active restriction inferred from an expired parade notice.
- Metro lot directory: **rejected for this curb import target**; operator leads require a separate E6 inventory. Directory counts/capacity are not current vacant spaces or general public permission. Freshness/reuse/ten exact condition checks unestablished.

## Public sign examples and independent check attempts

Exact SIGNTEXT excerpts below come from the live public view; use the OBJECTID as a reproducible query selector and retain GlobalID/geometry in future permission-reviewed fixtures. No driver locations are collected. Public asset coordinates are queried only to attempt association.

Distance comparisons used WGS84 equirectangular metres and shortest point-to-line segment distance against all 258 RegulatedStreetParking lines. They are research checks, not an assignment algorithm or a documented accuracy guarantee. No-photo/field validation was performed. The second official layer supports individual attributes; it is not assumed independent of City sign maintenance. Page comparisons are broader and do not verify every field at an exact sign.

| Sign OBJECTID / public area | Raw SIGNTEXT | Independent official check and outcome |
|---|---|---|
| 2838624 / Kirkland Ave east of garage | `2 HR PARKING 9:00 AM TO 7:30 PM` | RegulatedStreetParking 724, ~1.7 m, DURATION=3/TIME_FRAME=1. Duration/window agree; Sunday/holiday scope absent from sign text; full curb proof pending. |
| 2839612 / Market St | `4 HR PARKING 9:00 AM TO 7:30 PM` | Line 610, ~1.5 m, DURATION=4/TIME_FRAME=1; City page names four-hour Market corridor. Corroborates attributes, not all conditions. |
| 2839313 / Lakeshore area | `30 MIN PARKING 9:00 AM TO 7:30 PM` | Nearest line 594 ~50.8 m is ADA/Unspecified/Other: no valid match. City page broadly lists short-duration stalls; precise assignment unverified. |
| 2837327 / Lake & Central lot | `PAY PARKING 9:00AM TO 9:00PM $1.00 PER HOUR 4 HOUR LIMIT` | PaidParkingLots 3 footprint/City paid-lot guidance support tariff/window/limit, add day exceptions. Nearest curb 596 (~14.4 m) is two-hour: lot sign must not be joined to street. |
| 2837354 / Lakeshore lot | `3HR PARKING 9:00AM TO 5:00PM - PAY PARKING 5:00PM TO 9:00PM $1.00 PER HOUR` | Current City lot guidance describes daytime payment as well; possible stale/sign-specific exception, unresolved safety-relevant discrepancy. Nearest curb 584 ~68.8 m is not a match. Unknown until reconciled. |
| 2836444 / Juanita permit corridor | `NO PARKING 8AM - 2PM SCHOOL DAYS EXCEPT BY PERMIT` | [City Juanita section](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information) names 110th Ave NE corridor and permit requirement. Closest regulated line ~801.9 m: no precision check; City page does not establish school-day schedule/guest rights. |
| 2836445 / same corridor, separate sign | `NO PARKING 8AM - 2PM SCHOOL DAYS EXCEPT BY PERMIT` | Same [City Juanita named-street check](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information); closest line ~855.4 m. Separate public location, same incomplete corroboration; not two independent proof sources. |
| 2842411 / Lakeshore/Central area | `MOTORCYCLE PARKING ONLY NO LIMIT` | Line 719 ~1.6 m, MCYCL_PKNG=1, note repeats motorcycle/no-limit. Vehicle restriction agrees; applies to exact mapped extent only after reconciliation. |
| 2843896 / Central Way area | `MOTORCYCLE PARKING ONLY NO LIMIT` | Line 703 ~2.2 m, MCYCL_PKNG=1 but null duration/lifecycle. Category corroborated; incomplete current rule. |
| 2836783 / Kirkland Ave eastern area | `NO PARKING ANY TIME` | Nearest line 712 ~230.2 m is two-hour; unrelated curb cannot refute or confirm prohibition. City guidance acknowledges signed/red-curb restrictions; exact independent sign check missing. |
| 2839379 / school area north of Juanita | `NO STOPPING OR STANDING 8:50-9:50, Mon,Tues,Thurs,Fri: 3:10-4:20 Wednesday: 1:50-2:50 SCHOOL DAYS ONLY` | Closest regulated line ~2,642.8 m: no match. No official school calendar/AM-PM/precise extent corroboration acquired. Unknown. |
| 2837363 / Lakeshore EV area | `EV PARKING` | City EV guidance requires active charging; PaidParkingLots 2 supports lot location. Text omits conditions. Nearest curb 584 ~19.3 m cannot transfer ordinary parking rights. |

Additional real patterns for #32: **2836839** `NO PARKING BETWEEN SIGNS` (pair/extent unknown); **2837409** `NO OVERNIGHT PARKING` (overnight hours undefined); **2837096** `RESERVED PARKING STATE DISABLED PARKING PERMIT REQUIRED` (vehicle eligibility); **2837326** `NO EMPLOYEE PARKING 9:00AM TO 9:00PM KMC 12.45.250` (employee-context condition, not general no-parking); arrow variants such as `NO PARKING ANYTIME W/DBL ARROW` require facing/extent. None may acquire default days, rates or hours.

**Spot-check verdict:** twelve places attempted across permit, paid, time-limited and no-parking categories. Criterion 7 remains pending: incomplete independent exact-place checks and the Lakeshore mixed-payment discrepancy prevent zero-contradiction acceptance. Four near-line comparisons do not prove source completeness or satisfy the ten-location gate by themselves.

## Adapter requirements (preparation only)

1. Reuse #32 for Traffic_Signs_view E3; wait for #11's reviewed schema/evaluator contract. Validate required field names/types, geometry/reference system, domains, pagination/count and identity stability. A removed/renamed field fails the run; retain raw public text and reasons for Unknown. Do not repurpose asset points as parking meters.
2. Obtain documented complete inventory scope, lifecycle/removal semantics, sign-base/segment join, facing, arrows and termination at intersections/paired signs. Resolve **every applicable sign** on each curb side, including blank legends/supplementary signs. Nearest road/curb snapping alone is insufficient; no radius establishes entitlement across a corner or opposite side.
3. Recognize explicit duration/window/prohibition patterns only with supported day/holiday scope. Use America/Los_Angeles, DST and overnight day ownership from #11. School days need an authoritative calendar; ambiguous AM/PM, Other/Unspecified, overnight, dawn and exceptions stay Unknown. Do not borrow another sign's hours or assume all days.
4. Combine payment/time limits, no-stopping/tow-away, permit/employee, loading, ADA, motorcycle and active-charging constraints at exact extents. Mixed windows need separate conditions and reconciliation. Payment/device absence and “NO LIMIT” do not establish ordinary free permission.
5. Remove existing `parseSignText` default schedule/rate and `seed_kirkland.ts` fallback `2hr`, `$1.00/hr`, `Mon-Sat 9am-6pm` only in the later implementation; none changed here. Fixture tests must cover real raw examples, Unknown on incomplete/unknown text and incomplete curb assignments, proposed geometry exclusion, mismatched lot/curb, conflicts, stale sync and format change. Test public classification after #11 integration on an isolated Neon branch; production loading remains separately gated.

## Unknown areas and gaps

All Kirkland results remain Unknown until source approval and complete accepted adapters. Unsigned streets, missing/blank signs, incomplete exact curb mapping, private/other-city assets, unreconciled mixed payment, proposed curb features, school/calendar/holiday conditions and internal lot stall rights are excluded from the proposed subset. No approved source means current Coverage is none.

Full Coverage additionally needs proven complete E3 plus qualifying E7 (or complete E1), payment/permit constraints and daily precise E5 restrictions. These have not been established. Human preparation must reconcile archive/hosted reuse, completeness, 2018-versus-current curb metadata, exact independent checks and legal amendments. A policy gap is explicit commercial-use/ODbL scope conflict across versions; resolve source terms in approval, without changing ADR-0002 or granting approval through discovery.

## Tickets

- [#32 Kirkland E3 inventory/sign adapter](https://github.com/BinaryDevil/find-free-parking/issues/32): existing ticket reused; parser/tests/assignment remain open and #11-blocked.
- [#53 Source approval/completeness/reuse](https://github.com/BinaryDevil/find-free-parking/issues/53): human gate.
- [#54 RegulatedStreetParking E1 adapter assessment](https://github.com/BinaryDevil/find-free-parking/issues/54): pending source, #11/#53 blocked.
- [#55 City lots E6 adapter assessment](https://github.com/BinaryDevil/find-free-parking/issues/55): pending source, #11/#53 blocked.
- [#56 Missing temporary-restriction E5 request preparation](https://github.com/BinaryDevil/find-free-parking/issues/56): human outreach preparation; no request sent.
- [#57 Missing Juanita permit extents E4 request preparation](https://github.com/BinaryDevil/find-free-parking/issues/57): human outreach preparation; no request sent.
