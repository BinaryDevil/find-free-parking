# City data request drafts

Prepared 2026-10-14 for [#51](https://github.com/BinaryDevil/find-free-parking/issues/51), [#56](https://github.com/BinaryDevil/find-free-parking/issues/56) and [#57](https://github.com/BinaryDevil/find-free-parking/issues/57). **Unsent; awaiting authorization to contact each city.** No response, permission, source approval or Coverage is established. Both inventories remain draft with Coverage none.

These payloads request public infrastructure records and documentation only. No attachments or applicant, permit-holder, vehicle-registration, contact or private-address data are requested. Sender identity/reply details should be supplied through the sending account or records portal, not committed here. Do not incur fees without separate approval.

## North Vancouver temporary curb restrictions (#51)

Recipient: Engineering, Parks & Environment Department, **StreetUsePermit@cnv.org**, requesting routing to the responsible GIS/data custodian if needed. The [official Street-Use Permits page](https://www.cnv.org/streets-transportation/street-use-permits) lists this address; verified 2026-10-14. Scope is the **City**, not the District of North Vancouver. Context: [inventory](north-vancouver.md).

Subject: Public data inquiry: active temporary curb parking restrictions in the City of North Vancouver

Hello Street-Use Permits team,

I am developing Find Free Parking, a map that displays authoritative parking rules rather than parking vacancy. Could you direct me to the City's public machine-readable feed or existing electronic records for temporary curb parking restrictions and reservations, including construction, moving, crane, street-use and event restrictions?

For City-regulated curbs, I am looking for public reservation/restriction identifiers; exact street side and curb extents or geometry with coordinate-system documentation; restriction type; effective start and end with timezone; daily hours and recurrence; active/cancelled/superseded status; and applicable vehicle exceptions. Please include the existing field dictionary and any documentation explaining how multiple restrictions or changes are represented.

Could the responsible custodian also clarify publication/update cadence, whether cancellations and emergency restrictions are included, and the geographic and permit-type completeness of the feed? Our temporary-restriction checks require successful retrieval at least every 24 hours; a dated snapshot alone cannot support that requirement. If no such public feed exists, an existing electronic export and a description of its limitations would still help assess feasibility. This is not a request to create a new dataset.

Please identify the applicable reuse licence, attribution requirements and whether public infrastructure fields may be redistributed in a public map and small public validation fixtures. If no published licence applies, could the responsible official provide written permission or direct me to the permission process?

Please exclude applicant/contact information, permit-holder identities, private addresses and vehicle identifiers. Links to current official notices or sign/curb records for independent location checks would also help. I do not request certified copies. Please advise before any fee-bearing work; I am not authorizing charges.

Thank you for helping identify the authoritative source and its limits.

## Kirkland temporary restrictions and Juanita permit extents (#56, #57)

Recipient/channel: City Clerk public records, **PublicRecords@kirklandwa.gov**, or the portal linked from the [official Request Public Records page](https://www.kirklandwa.gov/Government/Departments/Finance-and-Administration/City-Clerk/Request-Public-Records). The official search-indexed page confirms the address and recommends its portal; direct page retrieval failed during this preparation. Verify the live portal before submission. Ask routing to Public Works Transportation/Engineering and GIS. Context: [inventory](kirkland.md).

Subject: Public electronic records request: Kirkland temporary curb restrictions and Juanita parking permit extents

Hello City Clerk team,

Please route this public electronic records request to the responsible Public Works Transportation/Engineering and GIS custodians. I am developing Find Free Parking, a map of authoritative parking rules rather than parking vacancy. I am requesting links to public feeds or existing electronic records and documentation for two separate subjects:

1. **Active temporary curb parking restrictions/reservations (#56).** Public stable restriction IDs; exact curb side and extents/geometry with coordinate system; restriction type; effective start/end and timezone; daily hours/recurrence; active, cancelled or superseded status; and applicable vehicle conditions. Please include existing schema/field documentation, update/publication cadence, cancellation handling, emergency/event inclusion and completeness by geography and restriction type. A feed refreshed at least daily is needed for our intended temporary-warning use; an existing snapshot and its limitations would help if there is no feed.
2. **Juanita permit enforcement extents (#57).** Current public permit-zone identifiers and exact signed curb applicability, including enforcement curb geometry/polygons and start/end or side markers where available. Please include existing documentation of enforcement days/hours, the applicable school-day calendar and exceptions, resident/guest/visitor conditions, effective dates, update cadence and completeness. Please distinguish permit eligibility areas from curbs where restrictions are enforced; a residential eligibility polygon alone cannot identify parking rules.

For each subject, please identify the existing licence/attribution requirements and any records documenting permission to redistribute public infrastructure fields in a public map and small public validation fixtures. Please route questions about written reuse permission to the appropriate official if that is a separate process. Existing official signs/notices or independent records suitable for checking exact locations would also help.

This request is limited to public infrastructure and rule information. Please exclude applicant/permit-holder identities, contact information, vehicle identifiers and private addresses. I am requesting existing records, not creation of a new dataset, certified copies or new analyses. If no records exist for a subject, please identify that separately. Please advise before fee-bearing work; I am not authorizing charges.

Thank you for helping identify the records and responsible custodians.

## After authorization and response

Record submission date/channel and reference number separately for each subject; record whether fees or clarification are requested. Keep private reply/contact details outside the repository. Preserve public responses and exact permission/source scope in the matching inventory only after reviewing for private data.

Assess all seven [ADR-0002 criteria](../adr/0002-evidence-source-policy.md), including at least ten independent precise checks with zero safety contradictions. E5 requires block-side-or-better precision and a successful sync within 24 hours; E4 requires precise polygons and documented curb applicability/conditions, with the seven-day runtime limit. Absence of a reservation or being outside a permit area never proves free permission. Neither a submitted request nor permission alone approves a source. #51/#56/#57 remain open until their response and acceptance requirements are met; adapters follow #11 integration and explicit source approval (#50/#53).
