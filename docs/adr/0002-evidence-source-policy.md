# Evidence Source Policy

Canonical policy for city Coverage setup and seeding, moved without policy changes from the [verified-rules spec (#2)](https://github.com/BinaryDevil/find-free-parking/issues/2) under [#23](https://github.com/BinaryDevil/find-free-parking/issues/23). Read with [ADR-0001](0001-verified-rules-only.md). Criterion 6 was amended by the project owner on 2026-10-20 to require public availability rather than published reuse terms. This records project acceptance policy, not a legal determination, implementation or source approval. Who approves sources, and how, is set by [ADR-0005](0005-agent-verified-gates.md).

This policy decides which data sources may be used to set up or seed a city, what each source may establish, and what Coverage a city can then claim. A city's source inventory is checked against it, and adapters and seeding may use only approved sources.

**Evidence types and what each may establish**

| Type | Examples | May establish | Never establishes |
|---|---|---|---|
| E1 Block-level regulation dataset (official, per block side, with days/times/limits) | SDOT Blockface, CNV Parking Regulations | `VERIFIED_FREE`, `PAID`, `RESTRICTED`, time limits | — |
| E2 Official meter / payment feed | Vancouver parking meters, RDW payment areas and fares | `PAID` with rates and hours; `VERIFIED_FREE` outside paid hours **only** when the same feed carries that meter's prohibition and time-limit fields | Free for unmetered blocks nearby |
| E3 Official sign inventory | Seattle Parking Signs, Kirkland signs, NYC parking-regulation signs | Rules for a block side once every sign on it is parsed and assigned | Free on a block side with no recorded signs (that is `UNKNOWN`, or E7 if the city states the inventory is complete) |
| E4 Official zone polygons | Vancouver Resident Permit Parking zones, Seattle RPZ zones, paid-parking areas | `RESTRICTED` / `PAID` inside the zone, with zone hours and visitor allowance when published | Free outside the zone |
| E5 Official temporary restrictions | Seattle Temporary No Parking, Vancouver Road Ahead | Overrides to `RESTRICTED` while active, as Driver-visible warnings | Free |
| E6 Official lot / operator data | City-owned lots, transit park-and-rides, municipal operator rate pages | Lot `VERIFIED_FREE` / `PAID` with hours and limits | Street rules |
| E7 Bylaw / code default rule | General time limit for unsigned streets (e.g. a 72-hour limit) | "Allowed unless signed" (a distinct, weaker label), only where the city says signs are the only exceptions | `VERIFIED_FREE` |
| Signal only | Citation and ticket data, Driver Reports, street-imagery sign detections, OSM (all tags), road class, missing meters, Google Places parking options | Warnings, or lowering a result to `UNKNOWN` | Any rule or Coverage |

Commercial data (INRIX, Parkopedia, Arrive and the like) is not an Evidence Source until a separate ADR accepts it.

**Acceptance criteria (every source must pass all of them before approval)**

1. **Authority.** Published by the regulating body (city, transportation department, transit agency, or its official operator) through an official channel, such as an open-data portal, official GIS server or official API.
2. **Machine-readable and stable.** A queryable endpoint with stable record IDs or geometry, and a recorded format (field list) that the adapter validates.
3. **Location precision.** Block side or better for E1, E3 and E5; polygon for E4; lot footprint or entrance for E6.
4. **Schedule semantics.** Days, times, limits and the timezone can be read from fields or from documented formats; anything ambiguous is `UNKNOWN`.
5. **Freshness signal.** A source edit date, a published update cadence, or a record-level timestamp. Last-edit dates over 24 months old need a fresh independent re-review before approval (ADR-0005).
6. **Public availability.** Retrievable through the official channel without sign-in, payment or bypassing access controls. Public availability is sufficient for reuse; no licence is sought or required, and a missing or unclear licence never makes a source pending or rejected. Record any licence or attribution text the publisher shows.
7. **Spot check.** At least 10 sample locations, chosen to include permit, metered, time-limited and no-parking cases, cross-checked against an independent official signal (city web page, a second official layer, the sign inventory, citation data, or a field photo when one already exists), with zero contradictions on fields that matter for safety (no stopping, tow-away, permit, payment).

**Coverage levels**

- **Full:** an E1 dataset citywide (or E3 complete plus E7), plus E2 for metered curbs if separate, E4 for permit zones, and E5 temporary restrictions synced at least daily.
- **Partial:** an explicitly declared subset (e.g. "metered blocks and permit zones only"). Everything outside it is `UNKNOWN`, and the city page states the subset.
- **None:** no approved source. The city page, if any, says "not covered".

**Freshness at runtime**

- E1–E4 and E6 rules count as verified only if the last successful sync is within 7 days.
- E5 needs a sync within 24 hours; otherwise results carry the caveat that temporary restrictions are unknown.
- A failed format check stops the sync, and rules from that source become `UNKNOWN`.

**Where to search, in order (record "none found" for each place searched)**

1. The city's open-data portal.
2. The city's ArcGIS organization and GIS server directories, including services not listed in the portal.
3. ArcGIS Online and Socrata catalog search.
4. Regional or national datasets (e.g. RDW in the Netherlands).
5. Transit agencies for park-and-rides.
6. The city's municipal code or bylaws for default rules.
7. Citation datasets, used only as signals.
8. If a type is still missing: record the searched locations and the evidence gap. Do not contact officials, governments or service providers; [ADR-0004](0004-no-external-outreach.md) supersedes the former data-request fallback.

The repo provides read-only discovery tooling (ArcGIS Online plus Socrata search, and a GIS-server crawl) and a `cover-city` agent skill that applies this policy and produces a per-city source inventory.

## Record-level corroboration amendment — proposed 2026-10-24, awaiting owner acceptance

**Status: proposed.** This section changes nothing until the project owner accepts it by merging the PR that adds it (ADR-0005: changing an ADR is an owner decision). Until then, criterion 7 above applies unchanged.

**Why.** Six pre-registered public-data tests found that official datasets disagree with the same agency's other official sources. In none of them could source-level zero contradiction be met. The tests were: Seattle Blockface (6 of 12 contradict, [#123](https://github.com/BinaryDevil/find-free-parking/pull/123)), the Vancouver meter feed (8 of 12, [#124](https://github.com/BinaryDevil/find-free-parking/pull/124)), the Seattle sign inventory (no published arrow or extent semantics, [#128](https://github.com/BinaryDevil/find-free-parking/pull/128)), King County Metro and Sound Transit lots (8 of 12 and 2 of 10 plus 2 unverified, [#132](https://github.com/BinaryDevil/find-free-parking/pull/132)), and the North Vancouver and Kirkland inventories. Under ADR-0004 nothing can settle which source is right, so one disagreement anywhere blocks a whole city. This amendment moves the safety decision from the source to the individual place.

**Decision.**

1. **Corroborated pair.** A source may be approved as one half of a *corroborated pair* with another approved official source. Both must pass criteria 1–6. The two must be separately maintained: different datasets with their own record identities and edit histories, where neither is a thematic view or export of the other. The same agency may publish both. Two representations of one upstream system (for example, two exports of the same meter table) are not a pair.
2. **Serving rule.** A place is served as `VERIFIED_FREE` only when all of the following hold for the selected time, stay and vehicle:
   - both layers cover that exact place at the precision criterion 3 requires;
   - both are approved and within their freshness limits;
   - both say parking is permitted without payment;
   - neither carries any restriction, payment, permit requirement or shorter time limit;
   - for every safety category (no stopping, tow-away, no parking, loading, bus or transit zone, permit, payment, temporary restriction), at least one of the two layers is documented to represent that category completely for the place. A category neither layer can represent leaves the place `UNKNOWN`. Silence is never agreement.
3. **Disagreement only makes results stricter.** Any restriction, payment, permit, condition or shorter limit in either layer applies. A conflict between "free" and anything else is `UNKNOWN` or the stricter result, never free. A failed sync or stale data in either layer makes the place `UNKNOWN`. Conditional permissions (riders, customers, time windows) stay conditional and are shown with their condition (owner decision, 2026-10-24).
4. **Criterion 7a, replacing criterion 7 for a corroborated pair.** Pre-register the served population: the places the serving rule would show as free, plus the restricted and paid places it would show. Draw at least 10 places at random with a fixed seed, covering the case types in criterion 7. Check each against a **third** official signal independent of both layers: a sign inventory, a curb-space layer, an operator page or citation data. Approval needs zero contradictions on criterion 7's safety fields. Places the pair disagrees on are excluded by rule 3 and are not sampled as served. Also record the pair's disagreement rate. If no third signal exists, the pair stays `pending`.
5. **Coverage and display.** A corroborated pair can support only **Partial** Coverage. Its subset is the places it serves, and the city page says free parking is shown only where two official sources agree. The popup names both sources and their as-of dates and keeps the reminder that posted signs take precedence.
6. **Unchanged.** Criteria 1–6, the evidence types and what each may establish, E7, freshness limits, the no-outreach rule (ADR-0004), two-agent approval (ADR-0005), and Driver Reports as display-only warnings that never change a classification.

**Accepted risk.** Errors that both layers share, such as a curb neither layer records correctly, cannot be measured without field checks, which ADR-0004 rules out. Criterion 7a bounds this only through the third-signal sample. The owner accepts this residual risk in exchange for any Coverage from public data. If a later check finds a shared error inside a served subset, the pair returns to `pending` until a fresh criterion 7a sample passes.

**Consequences.** This needs implementation before any pair can serve. Places must link records from two sources, the evaluator must apply rules 2–3, the coverage resolver must know about pairs, and the cover-city skill and inventories must change to describe pairs. Each is a separate reviewed ticket filed after acceptance. No source approval, Coverage or production action follows from this text alone.
