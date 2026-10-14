# City of North Vancouver: approval evidence and clarification request

Observed: 2026-10-14. Scope: [#50](https://github.com/BinaryDevil/find-free-parking/issues/50), supplementing the [inventory](north-vancouver.md) under [ADR-0002](../adr/0002-evidence-source-policy.md). Coverage remains none. Owner progression approval is already recorded on #50; no repeated discretionary owner approval is needed once factual prerequisites pass. This document does not grant City permission or approve a source.

## New evidence

The official [Maps page](https://www.cnv.org/City-Hall/About/Maps) names `gis@cnv.org` for GIS product inquiries. This is a verified first contact for reuse and canonical-source questions. The [pay-parking page](https://www.cnv.org/Streets-Transportation/Parking/Pay-Parking) publishes `cityparking@cnv.org` as a parking contact; GIS should route technical parking questions to the appropriate authority. Neither contact has been messaged.

On October 14, direct JSON checks of `MapServer/info/iteminfo?f=json` returned empty `licenseInfo` and `accessInformation` for StaffMap, ResidentPermitParking, pparking and curbaccessparking. The exact services are linked in the inventory. Public query access still supplies no recorded open licence or written reuse grant.

The pay page now resolves some program-level semantics: payment applies 09:00–21:00 every day, including statutory holidays unless signage says otherwise. The initial 30 minutes have zero parking charge but require registration; the subsequent half-hour costs $1, then $3/hour before 18:00 and $2/hour until 21:00. App sessions exceeding 30 minutes carry a $0.15 service fee. The page describes a zero-charge overnight period and zone-matched permit payment exemptions. These general terms do not reconcile the conflicting records, establish precise curb permission or authorize a GIS-derived dataset. No Verified Free classification follows from them.

## Decision matrix

| Source / gate | Evidence available | Decision and minimum missing evidence |
|---|---|---|
| StaffMap regulations 133 | Official curb geometry and heterogeneous edit dates; text schedules | Pending reuse, canonical-current-source statement, documented grammar/status/exemption meanings, exact sign-to-curb assignment and ten safe comparisons. |
| StaffMap signs 132 | Official points and record dates | Pending reuse; completeness, arrows/order/extents and current inspection evidence. W 3rd, Lonsdale and Delbruck conflicts remain unresolved. |
| StaffMap permit areas 136 / ResidentPermitParking zones 1 | Zone polygons | Pending reuse and currentness cadence; confirm eligibility versus signed curb enforcement and zone rights. Polygons alone are excluded from permission output. |
| ResidentPermitParking spaces 0 | Legacy curb records; inventory maximum edit July 2024 | Exclude from proposed canonical selection until City confirms currentness or replacement and dated over-24-month re-review is recorded. No automatic approval based on owner delegation. |
| pparking on-street 3 | Pay curb lines; public program rates/days/registration now documented | Pending reuse, effective-date/zone-to-tariff applicability, freshness cadence and conflicting sign reconciliation. No standalone free-after-hours rule. |
| curbaccessparking views | Alternate topic geometry | Pending exact view reuse/currentness/filter documentation; do not count same-origin views as independent safety confirmation. |
| Criterion 7 | Ten inventory probes | Still fails approval gate: category-only agreements and unresolved safety discrepancies are not ten zero-contradiction confirmations. Require exact curb extents, all applicable signs and authoritative resolution. |

A City response can close reuse/currentness/grammar questions. It must identify precise affected records and authoritative extents to resolve conflicts; a general statement that a map is current cannot substitute for the ten-location evidence. If permission is denied, exclude the source rather than amend its verdict to approved. District of North Vancouver remains outside scope.

## Unsent request

Suggested recipient: `gis@cnv.org`. Subject: Permission and authoritative parking-data clarification for City of North Vancouver.

Hello City GIS team,

We are preparing a public parking-rules map for the City of North Vancouver, separate from the District. It describes rules and conditions, not observed vacancies. Before importing or publishing City-derived rules, could you please confirm:

1. Whether we may query, cache, transform and publicly redistribute non-personal parking geometry/rules from StaffMap Parking Regulations (133), Parking Signs (132), Permit Areas (136), ResidentPermitParking spaces (0)/zones (1), pparking on-street (3), and selected curbaccessparking views. Please provide the licence or written permission, attribution, commercial-use restrictions and permitted refresh/access limits. We will omit editor identities and eligibility-address details.
2. Which service/view is authoritative and current, its effective date/update cadence, and whether the July 2024 resident-space layer is obsolete or requires re-review. Please identify replacement endpoints where applicable.
3. The documented meaning of lifecycle/planning flags, RE/EWP and permit exemptions; schedule grammar including school days, overnight ranges and blank values; and precise zone-to-curb/rate/registration applicability.
4. Current signed curb extents and all applicable signs for regulations 7774 (100 W 3rd), 7786 (200 Lonsdale), and 535 (1300 Delbruck), which differ from sign records 94, 44 and 3053 respectively. Please clarify whether the signs are obsolete, adjacent or concurrently applicable. Please also identify how sign direction/order and completeness should be interpreted.
5. Whether you can provide independent current confirmation for the ten public-location selectors in our inventory: regulations 59, 68, 69, 3197, 3199, 3191, 7774, 7786, 241 and 535, including payment, permit and no-stopping conditions and their exact curb scope.

Please route parking-regulation questions to the appropriate City team. We will keep unresolved locations Unknown and will not claim City endorsement.

Thank you.

## Completion boundary

The request is prepared, not sent. Sending requires explicit outreach authorization. Alternatively, the owner can supply an existing City permission/clarification response. Record the dated response and exact source scope before re-evaluating each ADR criterion. #50 remains open for third-party evidence and safety confirmation; #31 adapters remain dependent on #11. This work performs no import, database write, registry change, deployment or production operation.
