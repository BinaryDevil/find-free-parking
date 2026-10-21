# City of North Vancouver: approval evidence

> Source approval is two-agent review under [ADR-0005](../adr/0005-agent-verified-gates.md). Public availability satisfies [ADR-0002](../adr/0002-evidence-source-policy.md) criterion 6 (amended 2026-10-20); remaining gaps are resolved only from published evidence ([ADR-0004](../adr/0004-no-external-outreach.md)).

Current assessment: [2026-10-21 independent public-source review](north-vancouver-review-2026-10-21.md), with selected checksummed evidence. Public availability passes; unresolved safety/applicability criteria leave all sources unapproved and Coverage none. The historical observations below remain context.

Observed: 2026-10-14. Scope: [#50](https://github.com/BinaryDevil/find-free-parking/issues/50), supplementing the [inventory](north-vancouver.md) under [ADR-0002](../adr/0002-evidence-source-policy.md). Coverage remains none. Owner progression approval is already recorded on #50; no repeated discretionary owner approval is needed once factual prerequisites pass. This document does not approve a source.

## New evidence

On October 14, direct JSON checks of `MapServer/info/iteminfo?f=json` returned empty `licenseInfo` and `accessInformation` for StaffMap, ResidentPermitParking, pparking and curbaccessparking. The exact services are linked in the inventory. The services are publicly queryable, which satisfies criterion 6.

The pay page now resolves some program-level semantics: payment applies 09:00–21:00 every day, including statutory holidays unless signage says otherwise. The initial 30 minutes have zero parking charge but require registration; the subsequent half-hour costs $1, then $3/hour before 18:00 and $2/hour until 21:00. App sessions exceeding 30 minutes carry a $0.15 service fee. The page describes a zero-charge overnight period and zone-matched permit payment exemptions. These general terms do not reconcile the conflicting records, establish precise curb permission. No Verified Free classification follows from them.

## Decision matrix

| Source / gate | Evidence available | Decision and minimum missing evidence |
|---|---|---|
| StaffMap regulations 133 | Official curb geometry and heterogeneous edit dates; text schedules | Pending canonical-current-source evidence, documented grammar/status/exemption meanings, exact sign-to-curb assignment and ten safe comparisons. |
| StaffMap signs 132 | Official points and record dates | Pending completeness, arrows/order/extents and current inspection evidence. W 3rd, Lonsdale and Delbruck conflicts remain unresolved. |
| StaffMap permit areas 136 / ResidentPermitParking zones 1 | Zone polygons | Pending currentness cadence; confirm eligibility versus signed curb enforcement and zone rights. Polygons alone are excluded from permission output. |
| ResidentPermitParking spaces 0 | Legacy curb records; inventory maximum edit July 2024 | Exclude from proposed canonical selection unless published evidence shows it is current, and a dated over-24-month re-review is recorded. |
| pparking on-street 3 | Pay curb lines; public program rates/days/registration now documented | Pending effective-date/zone-to-tariff applicability, freshness cadence and conflicting sign reconciliation. No standalone free-after-hours rule. |
| curbaccessparking views | Alternate topic geometry | Pending currentness/filter documentation; do not count same-origin views as independent safety confirmation. |
| Criterion 7 | Ten inventory probes | Still fails approval gate: category-only agreements and unresolved safety discrepancies are not ten zero-contradiction confirmations. Require exact curb extents, all applicable signs and authoritative resolution. |

Unresolved conflicts stay Unknown unless published evidence identifies the precise affected records and authoritative extents; a general statement that a map is current cannot substitute for the ten-location evidence. District of North Vancouver remains outside scope.

## Completion boundary

#50 remains open for published evidence and safety confirmation; #31 adapters remain source gated; #11 is closed as independently checked 2026-10-21. This work performs no import, database write, registry change, deployment or production operation.
