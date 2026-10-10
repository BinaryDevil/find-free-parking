# Evidence Source Policy

Canonical policy for city Coverage setup and seeding, moved without policy changes from the [verified-rules spec (#2)](https://github.com/BinaryDevil/find-free-parking/issues/2) under [#23](https://github.com/BinaryDevil/find-free-parking/issues/23). Read with [ADR-0001](0001-verified-rules-only.md). This records the policy, not implementation or source approval.

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
5. **Freshness signal.** A source edit date, a published update cadence, or a record-level timestamp. Last-edit dates over 24 months old need human re-review before approval.
6. **Reuse terms.** An open licence, or written permission recorded in the inventory.
7. **Spot check.** At least 10 sample locations, chosen to include permit, metered, time-limited and no-parking cases, cross-checked against an independent official signal (city web page, a second official layer, the sign inventory, citation data, or a field photo), with zero contradictions on fields that matter for safety (no stopping, tow-away, permit, payment).

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
8. If a type is still missing: a data request or public-records request to the city.

The repo provides read-only discovery tooling (ArcGIS Online plus Socrata search, and a GIS-server crawl) and a `cover-city` agent skill that applies this policy and produces a per-city source inventory.
