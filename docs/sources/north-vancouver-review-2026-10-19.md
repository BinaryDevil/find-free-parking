# North Vancouver independent source review — 2026-10-19

> **Policy amendment (2026-10-20):** [ADR-0002](../adr/0002-evidence-source-policy.md) criterion 6 now tests official public retrieval without sign-in, payment or access-control bypass. Licence gaps and criterion-6 rejections in the dated observations below are historical and superseded; retain licence text for attribution. This amendment performs no fresh endpoint or safety check, approves no source and leaves Coverage none. All other evidence gaps and independent two-agent approval requirements remain.

Scope: [#50](https://github.com/BinaryDevil/find-free-parking/issues/50), independently reviewed by an agent that did not author the [inventory](north-vancouver.md). This is a partial review, not source approval. **Coverage remains none; no partial subset is approved.** The proposed subset remains only exact reconciled City curb segments, excluding District streets, unsupported lot rules, polygon interiors without signed applicability and unresolved curbs.

## Published reuse terms checked first

Read-only JSON retrieval of the following exact service item metadata succeeded on 2026-10-19. Each returned `licenseInfo=""` and `accessInformation=""`; no item description supplied a reuse grant.

| Service / candidate scope | Independently retrieved item metadata |
|---|---|
| StaffMap — Parking Signs 132, Parking Regulations 133, Permit Areas 136 | [StaffMap item](https://gisext2.cnv.org/arcgis/rest/services/BaseMapServices/StaffMap/MapServer/info/iteminfo?f=pjson) |
| ResidentPermitParking — space layer 0 and zone representations 1/2 | [ResidentPermitParking item](https://gisext2.cnv.org/arcgis/rest/services/Applications/ResidentPermitParking/MapServer/info/iteminfo?f=pjson) |
| pparking — on-street 3, off-street 2, pay zones 4 | [pparking item](https://gisext2.cnv.org/arcgis/rest/services/Applications/pparking/MapServer/info/iteminfo?f=pjson) |
| curbaccessparking — candidate views 1/2 | [curbaccessparking item](https://gisext2.cnv.org/arcgis/rest/services/Applications/curbaccessparking/MapServer/info/iteminfo?f=pjson) |
| curbaccessparking2 — candidate view 1 | [curbaccessparking2 item](https://gisext2.cnv.org/arcgis/rest/services/Applications/curbaccessparking2/MapServer/info/iteminfo?f=pjson) |

Independently inspected the official [Maps page](https://www.cnv.org/City-Hall/About/Maps), [CityMap](https://gisext2.cnv.org/citymap/) and search results for `site.cnv.org open data licence GIS CityMap reuse copyright` and `site.gisext2.cnv.org StaffMap licenseInfo Parking Regulations`. The Maps page permits downloading its standard PDF maps; it does not establish reuse rights for the listed GIS items. CityMap's terms address warranties/accuracy, without a grant covering these items. No exact-item published licence was found in this bounded review. Vancouver and District licences do not apply to City data. Contact invitations were not used.

**Verdict for every candidate layer/view in those five services: rejected (criterion 6), excluded.** Public access and empty copyright fields do not supply permission. Under [ADR-0004](../adr/0004-no-external-outreach.md), missing terms are not a request for outreach. Later published terms would require a new review; they would not resolve the other criteria automatically.

## What was independently checked

| ADR-0002 criterion | Performed evidence and result | Remaining gap |
|---|---|---|
| 1 Authority | Retrieved City GIS endpoints; official Maps/CityMap and pay page link City mapping. Official channel corroborated. | No source approved by authority alone. |
| 2 Machine-readable/stable | Retrieved JSON layer metadata for StaffMap 132/133/136, ResidentPermitParking 0 and pparking 3. Confirmed OBJECTID and GlobalID (GlobalID_1 for resident space); pay view has OBJECTID/ZONE_ID. | No fresh record export, identity stability test, adapter validation or pagination run. |
| 3 Precision | The five layer metadata responses report respectively point/polyline/polygon/polyline/polyline geometries. | No independent sign-to-curb side/direction/extent assignment or geometric spot check; polygon minimum is not curb entitlement. |
| 4 Schedule semantics | Independently retrieved [City pay guidance](https://www.cnv.org/Streets-Transportation/Parking/Pay-Parking); program hours, fees, registration and posted-exception conditions are summarized in the inventory. Metadata confirms the pay view lacks tariff/date fields and permit polygons lack schedule fields. | No record-specific exception join, full schedule grammar, permit-zone entitlement or canonical-source selection established. General guidance cannot resolve individual safety conflicts. |
| 5 Freshness | All five principal layer metadata responses lack editingInfo; regulation/sign/resident metadata expose record-date fields, pay view does not. | Record maxima/counts were not re-queried. July 2024 resident-space observation is historical and still requires a fresh independent safety re-review. No sync cadence established. |
| 6 Reuse | Five exact service items and official public pages/search above; no published applicable grant found. | Failed; all candidate layers in those services excluded. |
| 7 Spot checks | None performed in this review after the reuse failure. | The inventory's historical ten proximity probes remain unresolved, not ten passing checks. W 3rd/Lonsdale payment discrepancies and Delbruck no-stopping assignment remain open. No zero-contradiction finding or fresh resident-space re-review. |

The selected sources cannot contribute any Coverage. Other historical candidates (accessibleparking, ResidentExemptParking, bylaw, street-use guidance) were not independently refreshed; their recorded substantive rejections and Unknown cases remain. No new discovery sweep, source import, adapter, database operation, city registry change or production action was performed.

## Ticket outcome

The reuse-verdict part of #50 now has a concrete policy result. Current-source selection, ten independent exact-location confirmations, complete schedule/permit semantics, missing cadence and old-data re-review remain unmet. #50 stays open. The inventory stays draft; neither author/reviewer agreement on source approval nor an approved partial Coverage subset exists. [ADR-0005](../adr/0005-agent-verified-gates.md) requires evidence for all seven criteria before source approval.
