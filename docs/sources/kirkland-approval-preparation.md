# Kirkland source approval: remaining evidence

> Outreach sections are historical and superseded by [ADR-0004](../adr/0004-no-external-outreach.md). No requests may be sent or prepared; authorization steps below no longer apply. Source evidence gaps remain unresolved.

Status: preparation only; sources pending; Coverage none.
Rechecked: 2026-10-14.
Ticket: [#53](https://github.com/BinaryDevil/find-free-parking/issues/53).
Read with the [inventory](kirkland.md) and [ADR-0002](../adr/0002-evidence-source-policy.md).
No source approval, outreach, loading, database write or deployment is authorized by this document.

## Decision matrix

Approval requires all seven ADR-0002 criteria for each named source/version and an explicitly mapped subset. Passing authority or finding a recent edit date is insufficient.

| Candidate | Reconfirmed evidence | Remaining decision evidence | Present outcome |
|---|---|---|---|
| Traffic_Signs_view, item a4f70e4c9ff548f9b3c128257dc67353 | City-hosted points; OBJECTID, SIGNTEXT, OWNERSHIP, MAINT, GlobalID; no exposed relationships; edit 2026-07-14; item licence null | Exact hosted reuse terms; documented ID stability, complete applicable-sign scope, retirement updates, base/curb-side/facing/arrows/endpoints; complete conditions; ten exact independent checks | Pending E3; blank/unassigned/incomplete signs Unknown |
| Sign_Base_view | Public points expose OBJECTID, OWNERSHIP, MAINT, GlobalID; relationships empty; edit 2026-07-14 | Hosted reuse and documented sign/base join; pole geometry cannot supply a rule | Assignment support pending; rejected standalone rule feed |
| RegulatedStreetParking, item e75f64881e58468ab164d8fe85583243 | Licence blank; 2025-12-24 service edit; item narrative still describes August 2018 field accuracy; lifecycle field exists | Written maintenance/currentness explanation, covered versus omitted prohibitions, precise applicable extents, reuse, holidays and ten independent safety checks | Pending E1; Proposed/null lifecycle and ambiguous codes excluded |
| PaidParkingLots, item 03f4fab99ce1467c97e653bccff0833e | Licence null; edit 2026-02-24; polygon/name/hours/permit/notes/type fields; no GlobalID | Hosted geometry and page-derived terms, stable lot identity, complete stall/vehicle/permit conditions and exact checks; reconcile Lakeshore conflict | Pending E6; separate lot adapter #55 |
| ST archive / existing ST_Signs snapshot | Download-directory notice offers ODbL; local legacy metadata restricts commercial use | Exact archive version and which notice governs; written hosted-view scope and attribution/derivative obligations or permission | No inferred hosted licence; legacy snapshot not current rule evidence |

Direct metadata checks: [Traffic Signs item](https://www.arcgis.com/sharing/rest/content/items/a4f70e4c9ff548f9b3c128257dc67353?f=json), [curb item](https://www.arcgis.com/sharing/rest/content/items/e75f64881e58468ab164d8fe85583243?f=json), [lot item](https://www.arcgis.com/sharing/rest/content/items/03f4fab99ce1467c97e653bccff0833e?f=json), [sign layer](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Traffic_Signs_view/FeatureServer/0?f=json), [base layer](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Sign_Base_view/FeatureServer/0?f=json). The archive [notice](https://inter.kirklandwa.gov/gisdata/AllData/_disclaimercopyright.txt) was fetched as Windows-1252 after the web reader could not decode it. Existing [ST_Signs metadata](../../datasets/USA/WA/Kirkland/kirkland_streets_extracted/ST_Signs.shp.xml) records the conflicting restriction. This documents terms, not a legal conclusion about which notice overrides another.

## Safety and current legal context

The live [query for sign 2837354](https://services2.arcgis.com/loGMwowmR0OPlOQb/arcgis/rest/services/Traffic_Signs_view/FeatureServer/0/query?objectIds=2837354&outFields=OBJECTID%2CSIGNTEXT&returnGeometry=false&f=json) still describes three-hour daytime parking followed by evening payment. The [City parking page](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information) lists daytime payment for the Lakeshore public lot. A stale sign, special stall or changed policy are possible explanations, not verified resolutions. Require the exact sign/stall extent, effective schedule and replacement history. Keep its result Unknown; do not choose the more permissive source.

The same City page distinguishes permit streets, active EV charging and employee/assigned stalls. General lot guidance does not establish each sign's school-day calendar, holidays, visitor rights or vehicle eligibility. The inventory's twelve attempted places remain attempts, not ten passing checks. For approval, record exact asset/curb/stall IDs, every safety-relevant field, independent official comparison, observation date and contradiction resolution. Related/nearest geometry and duplicated sign text do not establish independent corroboration or completeness.

[September 1 council minutes](https://kirkland.granicus.com/MinutesViewer.php?clip_id=5240&view_id=13) record O-4946 adopted 6–1, amending KMC 12.40 and 12.45. They link the [ordinance record](https://docs.kirklandwa.gov/CMWebDrawer/Recordhtml/632784). The linked document body could not be retrieved by the web reader; adoption is confirmed, but effective provisions and their applicability are not. Obtain the enacted text/effective date and current consolidated code through [City Codes and Laws](https://www.kirklandwa.gov/Government/Codes-and-Laws) before implementing code-derived vehicle conditions. No older code/default is approved here.

## Unsent clarification draft

Verified routing: [City parking page](https://www.kirklandwa.gov/Government/Departments/Public-Works-Department/Transportation/Downtown-Parking-Information) lists parking@kirklandwa.gov for operational clarification. For existing GIS/Public Works and enacted-ordinance records, the [City records page](https://www.kirklandwa.gov/Government/Departments/Finance-and-Administration/City-Clerk/Request-Public-Records) recommends its portal and lists PublicRecords@kirklandwa.gov. Direct page retrieval returned 403; the official-domain search representation supplied the records channel. Reopen the page and confirm routing at submission. Do not invent a GIS mailbox. No message sent.

Subject: Kirkland parking GIS reuse, sign assignment and current rule clarification

Hello,

We are preparing a map of authoritative parking rules, rather than parking vacancy. Before using Kirkland's public data, could you route these questions to the responsible GIS and parking staff?

1. Please identify the applicable reuse terms for Traffic_Signs_view, Sign_Base_view, RegulatedStreetParking and PaidParkingLots, including source/version scope, commercial use, required attribution and derivative publication. The download directory offers ODbL, hosted item licence fields are blank/null, and our older ST_Signs metadata restricts commercial use. We need clarification rather than assuming one notice applies to every service.
2. Please provide existing documentation of sign completeness, stable IDs and retirement/update lifecycle, plus sign/base/curb-side joins, facing, arrows and termination extents. Which areas and sign types are excluded? Is there a current complete export with these fields?
3. RegulatedStreetParking still describes field accuracy as of August 2018 despite December 2025 edit metadata. What maintenance/inspection records establish currentness, and how should Proposed and null lifecycle features be treated?
4. Sign OBJECTID 2837354 describes daytime three-hour parking and evening payment, while current Lakeshore public-lot guidance lists daytime payment. Please identify its exact applicable stalls, current schedule/effective date and replacement history.
5. Please identify existing current records for holiday/school-day calendars and sign conditions, including vehicle, permit/visitor, employee and charging restrictions, and the enacted O-4946 text/effective date and current KMC 12.40/12.45 amendments.

Electronic links or existing documentation are welcome. Please advise any fee before incurring it. We are not requesting personal permit-holder or enforcement case data.

Thank you.

## Human actions and completion boundary

1. Approve or send the clarification above; records production cannot substitute for a grant of reuse rights. Coordinate routing with [#56](https://github.com/BinaryDevil/find-free-parking/issues/56) and [#57](https://github.com/BinaryDevil/find-free-parking/issues/57), which separately prepare missing temporary-restriction and Juanita extent requests.
2. Record authoritative responses and dates, exact source/version terms and currentness/assignment documentation; then complete the independent safety checks. Do not mark a source approved just because its owner is willing to approve it.
3. Approve each selected named source only after every policy criterion passes; identify its exact partial subset and all Unknown exclusions. Keep #53 open while evidence is missing. Source approval would still not authorize loading, Coverage publication or production rollout; #11, adapter acceptance and later release gates remain separate.
