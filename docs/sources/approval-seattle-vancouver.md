# Seattle and Vancouver source approval preparation

> **Approvals:** this preparation predates [ADR-0005](../adr/0005-agent-verified-gates.md). The decisions it frames for a human are now made by independent two-agent review, using published reuse terms only.

> Outreach sections are historical and superseded by [ADR-0004](../adr/0004-no-external-outreach.md). No requests may be sent or prepared; authorization steps below no longer apply. Source evidence gaps remain unresolved.

Prepared for [#24](https://github.com/BinaryDevil/find-free-parking/issues/24), checked 2026-10-13 (America/Vancouver). **Decision status: pending human review.** This is a terms assessment and decision artifact, not an approval or permission grant. Both inventories remain draft, Coverage remains none, and no Evidence Source state was changed or database inspected/written. No external request was sent.

Read with [Seattle inventory](seattle.md), [Vancouver inventory](vancouver.md), [ADR-0002](../adr/0002-evidence-source-policy.md), and [Evidence provenance](../EVIDENCE_PROVENANCE.md). Their existing spot checks are dated observations, not freshly repeated safety validation. #20 is closed; #21 remains open although its inventory PR #38 is integrated into dev. This preparation does not close either #21 or #24.

## Published terms and scope

### Seattle

The City's [Open Data Policy V1.0, February 1, 2016](https://www.seattle.gov/documents/departments/tech/opendata/cos_opendatapolicy.pdf), section 1.D and section 3.E–F, describes unrestricted reuse of portal datasets, including commercial use, with possible source/version/modification identification requirements and dataset citation guidance. It defines the portal as data.seattle.gov. This is a published policy basis, not a named Creative Commons licence. The PDF date is its printed date, not a search-engine crawl date.

For each item below, read its `owner`, `url`, `licenseInfo` and `accessInformation` through the linked ArcGIS JSON. Match the inventory's service/layer to the portal catalog's `metadata.additional_access_points` (ArcGIS GeoService) and item-specific download links. Catalog requests used `search_context=data.seattle.gov`, queries `parking`, `blockface`, then each unmatched item title, `limit=100`. These bounded searches do not prove that unmatched items are unpublished. Linked portal entries establish exact publication scope for the listed layers only; a sibling layer is not automatically included. Accuracy disclaimers supply no reuse grant by themselves.

**Assessment:** policy plus exact catalog publication is stronger evidence than a general City reuse statement. A human must accept that basis for the listed layers or obtain City confirmation; it does not settle permission for unlinked services, third-party data, transit agencies or operator feeds. No source is approved on this inference.

| GIS source/item | Published owner | Exact portal publication observed | Reuse evidence / decision |
|---|---|---|---|
| [Curb Space Categories with Symbology (Active)](https://www.arcgis.com/sharing/rest/content/items/018203ec2ed241f6b6bc85be2f7a2454?f=json) | `Transportation_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Accuracy disclaimer only; Explicit source permission/scope confirmation pending. |
| [Parcels Within 10ft of Driveways and Parkings Lots](https://www.arcgis.com/sharing/rest/content/items/171b624d920049539a50bcae9ac6d169?f=json) | `CityLight_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Empty licence field; Explicit source permission/scope confirmation pending. |
| [Peak Hour Parking Restrictions](https://www.arcgis.com/sharing/rest/content/items/19f041b427604175810c0f294e77dfdf?f=json) | `Transportation_SeattleCityGIS` | [eibc-354k](https://data.seattle.gov/dataset/eibc-354k) → layer 3 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Parking Categories](https://www.arcgis.com/sharing/rest/content/items/258c084aa09a427fbb91197439e16e25?f=json) | `Transportation_SeattleCityGIS` | [vded-w5y6](https://data.seattle.gov/dataset/vded-w5y6) → layer 0 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Driveways and Parking Lots Dissolved](https://www.arcgis.com/sharing/rest/content/items/29c897b2f9d642ea8d0372cabec65e66?f=json) | `CityLight_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Empty licence field; Explicit source permission/scope confirmation pending. |
| [Public Garages and Parking Lots](https://www.arcgis.com/sharing/rest/content/items/3029d63401544cd6b9783ef1bfb40b91?f=json) | `Transportation_SeattleCityGIS` | [3qbw-quib](https://data.seattle.gov/dataset/3qbw-quib) → layer 1 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Parking Tiers](https://www.arcgis.com/sharing/rest/content/items/4159ee278747484ab456576198b54263?f=json) | `Transportation_SeattleCityGIS` | [8fnw-5fi3](https://data.seattle.gov/dataset/8fnw-5fi3) → layer 0 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Curb Space Categories](https://www.arcgis.com/sharing/rest/content/items/4a2fe0abbaa0468b90f841be631c798b?f=json) | `Transportation_SeattleCityGIS` | [9k9u-degx](https://data.seattle.gov/dataset/9k9u-degx) → layer 6 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Paid Area Curb Spaces](https://www.arcgis.com/sharing/rest/content/items/69af206729884701b32f5a810a1c6405?f=json) | `Transportation_SeattleCityGIS` | [8hxw-4kw3](https://data.seattle.gov/dataset/8hxw-4kw3) → layer 0 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Curb Space Reserve (Active)](https://www.arcgis.com/sharing/rest/content/items/8c91829ccb624aa2a997fa4ecca4d5fd?f=json) | `Transportation_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Accuracy disclaimer only; Explicit source permission/scope confirmation pending. |
| [SDOT Pay Stations](https://www.arcgis.com/sharing/rest/content/items/a628092ecd4741e6a11877ce7211795b?f=json) | `Transportation_SeattleCityGIS` | [y6ip-emxc](https://data.seattle.gov/dataset/y6ip-emxc) → layer 0 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Blockface](https://www.arcgis.com/sharing/rest/content/items/b35fb25c8c93425980705474b5e82815?f=json) | `Transportation_SeattleCityGIS` | [sppq-j5q5](https://data.seattle.gov/dataset/sppq-j5q5) → layer 1 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Driveways and Parking Lots](https://www.arcgis.com/sharing/rest/content/items/b98de756b282485a9baee83856c159e2?f=json) | `CityLight_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Empty licence field; Explicit source permission/scope confirmation pending. |
| [Parking Features](https://www.arcgis.com/sharing/rest/content/items/c599cc4b87bd411787ab88cd4e99fbda?f=json) | `Transportation_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Empty licence field; Explicit source permission/scope confirmation pending. |
| [Temporary No Parking](https://www.arcgis.com/sharing/rest/content/items/dd379f4f60294aea9d813185fb5144a4?f=json) | `Transportation_SeattleCityGIS` | [evhv-7f58](https://data.seattle.gov/dataset/evhv-7f58) → layer 2; [ktrw-vxt6](https://data.seattle.gov/dataset/ktrw-vxt6) → layer 0; [r34e-q8ku](https://data.seattle.gov/dataset/r34e-q8ku) → layer 1 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Parking Signs](https://www.arcgis.com/sharing/rest/content/items/de918034c876456cbf11e4b234985142?f=json) | `Transportation_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Accuracy disclaimer only; Explicit source permission/scope confirmation pending. |
| [Curbspace Transit Layover](https://www.arcgis.com/sharing/rest/content/items/e3ade4fddd5a4cb38ae0a068b14be2fd?f=json) | `Transportation_SeattleCityGIS` | [d3n6-nhwx](https://data.seattle.gov/dataset/d3n6-nhwx) → layer 0 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |
| [Temporary No Parking Unpaid](https://www.arcgis.com/sharing/rest/content/items/f486ed9dacf3488d94169f67fb48c931?f=json) | `Transportation_SeattleCityGIS` | No exact item-linked portal access point found in the searches | Accuracy disclaimer only; Explicit source permission/scope confirmation pending. |
| [Restricted Parking Zone Areas](https://www.arcgis.com/sharing/rest/content/items/f6f00c5cf9634d578d41156bf4a4679f?f=json) | `Transportation_SeattleCityGIS` | [45qc-3pej](https://data.seattle.gov/dataset/45qc-3pej) → layer 1; [netm-8y6z](https://data.seattle.gov/dataset/netm-8y6z) → layer 4; [ypxj-ijse](https://data.seattle.gov/dataset/ypxj-ijse) → layer 3 | Accuracy disclaimer only; Published policy + exact portal link; human scope acceptance pending. |

RPZ layer 0 (signed blocks) has no exact access point established here; layers 1/3/4 are listed above. Temporary reservation layers 0/1/2 each have their own catalog access point. Parking Features layers 0/2/3/4 and the unlinked supplemental services remain permission-pending even when derived from another SDOT source. Credit for the SDOT items is City of Seattle / Seattle Department of Transportation; the three land-cover items are owned by CityLight_SeattleCityGIS, correcting the earlier blanket SDOT-owner statement.

The remaining Seattle inventory entries retain these boundaries:

| Entry | Terms observed / scope | Decision |
|---|---|---|
| Paid Parking Transaction Data (`gg89-k5p6`), Last 48 Hours (`hiyf-7edq`), 2026 occupancy (`q2e4-e7e5`), Annual Parking Study (`7jzm-ucez`), 72hr violations (`74ix-6xdj`) | Live `/api/views/<id>.json` reports `licenseId=PUBLIC_DOMAIN` for all five. | Reuse evidence recorded for those portal datasets; signal only, never Parking Rules or Coverage. Exclude personal/vehicle fields. |
| Seattle Vehicle Infractions catalog reference | Inventory discovery reference only; no current geocoded source or reuse basis established in this preparation. | No import proposed; terms unresolved if selected later. |
| King County Metro / Sound Transit pages | Separate publishers; Seattle policy does not apply. No data-specific licence recorded. | Rejected as import-ready in inventory; obtain terms and remaining criteria before proposing an adapter. |
| Diamond operator location feed | Separate publisher; no reusable feed licence established. | Rejected as import-ready; no permission inferred from public access. |
| Seattle municipal code / 72-hour guidance | Official legal/guidance reference; no bulk GIS grant inferred. | No import proposed; does not satisfy E7 signs-only exception requirement. |

Proposed attribution for any subsequently accepted Seattle GIS input: identify the City/department, exact source and link, retrieval/source version or edit date, and our transformations. Do not imply endorsement or accuracy guarantees. This is a compliance proposal awaiting review, not a claim of an implemented attribution UI.

### Vancouver

The [permit service metadata](https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/ResidentialParkingPermitZones/FeatureServer?f=pjson) reports `serviceItemId=8295da8234aa459e88f152f762548585` and copyright City of Vancouver. Its [item JSON](https://www.arcgis.com/sharing/rest/content/items/8295da8234aa459e88f152f762548585?f=json) is owned by `City_of_Vancouver`, points to that service, credits City of Vancouver, and still reports `licenseInfo=CC BY`. No version or licence URL is supplied. Do not turn that shorthand into CC BY 4.0 or a scope grant for all City services.

The City's [Terms of Use, VanMap section](https://vancouver.ca/your-government/terms-of-use.aspx) licenses VanMap-derived data under OGL-Vancouver, retains City ownership/credit, and limits that section's scope to VanMap. Its disclaimers and liability provisions also apply. [Portal help](https://opendata.vancouver.ca/pages/help/) describes both portal and VanMap publications as open data. The [official permit page](https://vancouver.ca/streets-transportation/buy-your-annual-or-short-term-or-visitor-parking-permit.aspx) links a [permit map](https://vanmapp1.vancouver.ca/gmaps/covmap.htm?map=residential_parking_areas&zoom=12), but that map link alone does not establish that this exact hosted service is its licensed data input. No exact VanMap-to-service chain was established in this check.

The [Open Government Licence – Vancouver](https://opendata.vancouver.ca/pages/licence/) grants worldwide, royalty-free, perpetual, non-exclusive lawful reuse, including commercial adaptation and redistribution. Attribution must use the provider's specified form, or the licence's default if none is specified; multiple providers may use the prescribed combined statement. Personal information, unlicensed third-party rights and official marks are excluded. It grants no endorsement and disclaims warranties; breach terminates rights. The inventory records v1.0; the page says it is based on BC OGL v2.0, which does not make it CC BY 2.0. Recheck the applicable text when permission scope is resolved.

| Input | Recorded basis | Decision |
|---|---|---|
| Portal parking meters | Portal dataset OGL-Vancouver, already recorded in inventory | Terms basis recorded; safety/feed reconciliation still pending #28. |
| Hosted ResidentialParkingPermitZones/0 | City ownership, unversioned CC BY; possible VanMap OGL scope lead | **Pending** exact licence/version/scope or written permission. Existing unlisted-service gate remains. |
| Other Vancouver hosted inputs, including Road Ahead | Existing inventory-specific terms; permit permission would not cover them | Keep each existing pending/rejected verdict; no blanket approval. |

For OGL-licensed inputs with no specified attribution, use the licence's default attribution: “Contains information licensed under the Open Government Licence – Vancouver.” Include the source and licence links and describe transformations separately. For the hosted permit service, await the City's confirmation of applicable licence and required attribution before selecting wording.

## Approval matrix and remaining decisions

| #24 requirement | Preparation evidence | Human decision / remaining prerequisite |
|---|---|---|
| Confirm terms for every Seattle source | Exact-item ownership/terms matrix; portal-layer links and policy; explicit unresolved entries | Accept the published-policy basis for named layers or request confirmation. Resolve all proposed unlinked inputs separately. Rejected/reference-only entries are not loading candidates. Requirement remains incomplete. |
| Vancouver permit published licence or written permission | Exact service/item match, CC BY shorthand, scoped VanMap/OGL lead | City confirmation of exact hosted-service scope and licence/version, or written permission; then record the evidence link and attribution. Requirement remains incomplete. |
| Approve both inventories with name/date and matching Evidence Source states | Draft inventories and their unresolved acceptance criteria retained | Review all seven ADR criteria for each selected source, resolve safety contradictions, name the approved subset, approver/date and reviewed commit. No full-inventory approval recommended now. |

Seattle still needs exact curb allocation/schedule/sign semantics, RPZ hour contradictions resolved, and independent active temporary-restriction checks. Vancouver still needs meter feed conflicts resolved and exact signed permit applicability/hours/exemptions. Reuse clearance alone cannot waive these requirements. Full Seattle Coverage is not established; Vancouver's intended subset remains metered curbs plus confirmed signed permit restrictions, with other curbs Unknown.

After a human decision, update only the explicitly approved inventory sources with approver/date and evidence, then prepare a separate authorized Evidence Source registration/approval operation using the reviewed schema (`approval_state`, `approved_by`, `approved_at`, `licence`, `reuse_terms`). Compare the source keys/endpoints and states to the inventory in the explicitly named environment. No live state match is claimed here. Schema constraints do not prove policy acceptance. Source approval is separate from authorization to load data, sync, deploy or go live; production writes still need target, snapshot and explicit human approval under [DATA](../DATA.md).

## Unsent clarification drafts

These are copyable drafts only; no email or form submission was created. Send only after explicit authorization naming the recipient/channel and final text.

### Vancouver — exact permit-service licence

Channel to verify before sending: City's [Open Data contact form](https://opendata.vancouver.ca/pages/contact/). Ask the team to route to the data owner if needed; no recipient email guessed.

Subject: Confirm reuse licence for Resident Parking Fees and Zones GIS service

We are preparing Find Free Parking, a public parking-rule map. Could you confirm the licence and scope for City-owned ArcGIS item 8295da8234aa459e88f152f762548585, “Resident Parking Fees and Zones”, and layer 0 of https://services3.arcgis.com/qrcTTRTwUoS8N47o/arcgis/rest/services/ResidentialParkingPermitZones/FeatureServer?

The item says CC BY without a version or link. Does Open Government Licence – Vancouver apply to this exact hosted service as VanMap data, or does a specific Creative Commons Attribution version apply? Please provide the applicable licence URL/version and attribution requirements, and confirm whether it permits automated retrieval, local storage, adaptation into derived Parking Rules, public map/API redistribution and commercial use of its public geometry and non-personal attributes. If neither published licence covers this service, may we have written permission for those uses and any conditions? We will exclude personal information and official marks and will not imply City endorsement or vacancy observations.

### Seattle — unresolved services / policy applicability

Channel to verify before sending: the official [Open Data program](https://www.seattle.gov/tech/reports-and-data/open-data), routed to SDOT GIS/data owner. Portal metadata for Blockface publishes a GIS contact; confirm the current contact before using it.

Subject: Confirm Seattle GIS open-data reuse scope for parking-rule sources

We are preparing a public parking-rule map using SDOT data. The City's Open Data Policy sections 1.D and 3.E describe open reuse, including commercial use, and several data.seattle.gov entries directly link to the GIS layers in the matrix above. Could you confirm that this policy covers automated retrieval, storage, adaptation and public map/API redistribution of those exact published layers, and specify attribution/version/modification requirements?

Please also confirm an open licence or written permission for the proposed unlinked inputs: Parking Signs (de918034c876456cbf11e4b234985142, layer 0), Parking Features (c599cc4b87bd411787ab88cd4e99fbda, layer 4 sign text if used), and any selected supporting services in the attached matrix. Their item licence fields provide a disclaimer or are empty. Please identify coverage by item/layer, exclusions and any conditions; permission for one service will not be assumed to cover another. We will exclude personal/contact fields and will not imply City endorsement or space vacancy.

Before sending, attach this matrix and narrow “selected supporting services” to the actual proposed inputs. The rejected City Light land-cover and operator candidates need no request unless scope changes.
